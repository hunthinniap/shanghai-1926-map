"""Read-only JSON-RPC client for configured heritage-research MCP services.

Credentials and session headers stay in memory; curl receives them via stdin.
"""
import json
from pathlib import Path
import subprocess
import tempfile
import time
import tomllib
from urllib.parse import parse_qsl, urlsplit


class ConfiguredMcpClient:
    def __init__(self, server):
        with (Path.home() / '.codex/config.toml').open('rb') as stream:
            config = tomllib.load(stream)['mcp_servers'][server]
        if not config.get('enabled', True) or not config.get('url', '').startswith('https://'):
            raise ValueError('The requested MCP service is not enabled over HTTPS.')
        self.endpoint = config['url']
        self.headers = config.get('http_headers', {})
        self.session = None
        self.counter = 0
        self.protocol = '2025-03-26'
        self.secrets = [self.endpoint, *[value for _, value in parse_qsl(urlsplit(self.endpoint).query) if len(value) >= 8]]
        for value in self.headers.values():
            if len(value) >= 8:
                self.secrets.append(value)
                if value.startswith('Bearer '):
                    self.secrets.append(value[7:])

    def redact(self, value):
        text = json.dumps(value, ensure_ascii=False)
        for secret in self.secrets:
            text = text.replace(secret, '[REDACTED]')
        return json.loads(text)

    def rpc(self, method, params=None, notification=False):
        self.counter += 1
        payload = {'jsonrpc': '2.0', 'method': method}
        if params is not None:
            payload['params'] = params
        if not notification:
            payload['id'] = self.counter
        # A timed-out billed search may already have executed. Do not retry it
        # automatically; the caller reserves that call's possible charge.
        attempts = 1 if method == 'tools/call' else 3
        for attempt in range(attempts):
            with tempfile.TemporaryDirectory() as directory:
                header_path = Path(directory) / 'response-headers'
                body_path = Path(directory) / 'request.json'
                body_path.write_text(json.dumps(payload, ensure_ascii=False), encoding='utf-8')
                headers = {**self.headers, 'Content-Type': 'application/json',
                           'Accept': 'application/json, text/event-stream', 'MCP-Protocol-Version': self.protocol}
                if self.session:
                    headers['Mcp-Session-Id'] = self.session
                config = 'url = ' + json.dumps(self.endpoint) + '\nrequest = "POST"\n'
                config += ''.join('header = ' + json.dumps(key + ': ' + value) + '\n' for key, value in headers.items())
                process = subprocess.run(['curl', '--silent', '--show-error', '--max-time', '25',
                                          '--dump-header', str(header_path), '--data-binary', '@' + str(body_path), '--config', '-'],
                                         input=config, text=True, capture_output=True)
                if process.returncode:
                    if attempt + 1 < attempts:
                        time.sleep(attempt + 1)
                        continue
                    raise ConnectionError('MCP transport failed (curl ' + str(process.returncode) + ').')
                for line in header_path.read_text().splitlines():
                    if line.lower().startswith('mcp-session-id:'):
                        self.session = line.split(':', 1)[1].strip()
                raw = process.stdout.strip()
                if not raw:
                    return None
                try:
                    result = json.loads(raw)
                except json.JSONDecodeError:
                    messages = []
                    for block in raw.replace('\r\n', '\n').split('\n\n'):
                        data = '\n'.join(line[5:].strip() for line in block.splitlines() if line.startswith('data:'))
                        if data:
                            try:
                                messages.append(json.loads(data))
                            except json.JSONDecodeError:
                                pass
                    result = next((message for message in messages if message.get('id') == payload.get('id')), None)
                    if result is None:
                        raise ConnectionError('MCP returned no matching JSON-RPC response.')
                if result.get('error'):
                    raise RuntimeError(json.dumps(self.redact(result['error']), ensure_ascii=False))
                return self.redact(result.get('result'))

    def initialize(self):
        result = self.rpc('initialize', {'protocolVersion': self.protocol, 'capabilities': {},
                                        'clientInfo': {'name': 'heritage-poi-research', 'version': '1.0'}})
        if not result or not result.get('protocolVersion'):
            raise ConnectionError('MCP initialization returned no negotiated protocol.')
        self.protocol = result['protocolVersion']
        self.rpc('notifications/initialized', notification=True)
        return result

    def call_read_tool(self, name, arguments, allowed_tools):
        if name not in allowed_tools:
            raise ValueError('This research client only calls explicitly selected reading tools.')
        return self.rpc('tools/call', {'name': name, 'arguments': arguments})
