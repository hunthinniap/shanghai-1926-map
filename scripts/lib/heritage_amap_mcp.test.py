import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

from heritage_amap_mcp import ConfiguredMcpClient


class ClientTests(unittest.TestCase):
    def config(self, folder):
        path = Path(folder) / '.codex'
        path.mkdir()
        (path / 'config.toml').write_text('[mcp_servers.test]\nurl="https://example.invalid/mcp"\n'
                                        '[mcp_servers.test.http_headers]\nAuthorization="Bearer fake-private-token"\n')

    def test_chinese_tool_arguments_reach_the_http_body_unchanged(self):
        with tempfile.TemporaryDirectory() as folder:
            self.config(folder)
            with patch('heritage_amap_mcp.Path.home', return_value=Path(folder)):
                client = ConfiguredMcpClient('test')

            def run(command, **kwargs):
                body = Path(command[command.index('--data-binary') + 1][1:])
                actual = json.loads(body.read_text())
                self.assertEqual(actual['params']['arguments']['keywords'], '新康花园·淮海中路1273弄')
                self.assertNotIn('fake-private-token', ' '.join(command))
                Path(command[command.index('--dump-header') + 1]).write_text('HTTP/2 200\n')
                return subprocess.CompletedProcess(command, 0, json.dumps({'jsonrpc': '2.0', 'id': 1,
                    'result': {'credentialEcho': 'fake-private-token'}}), '')

            with patch('heritage_amap_mcp.subprocess.run', side_effect=run):
                result = client.call_read_tool('amap_poi_search', {'keywords': '新康花园·淮海中路1273弄'}, {'amap_poi_search'})
            self.assertEqual(result['credentialEcho'], '[REDACTED]')

    def test_a_billed_tool_is_not_automatically_retried_after_a_transport_failure(self):
        with tempfile.TemporaryDirectory() as folder:
            self.config(folder)
            with patch('heritage_amap_mcp.Path.home', return_value=Path(folder)):
                client = ConfiguredMcpClient('test')
            with patch('heritage_amap_mcp.subprocess.run', return_value=subprocess.CompletedProcess([], 35, '', '')) as run:
                with self.assertRaises(ConnectionError):
                    client.call_read_tool('amap_poi_search', {'keywords': '新康花园'}, {'amap_poi_search'})
                self.assertEqual(run.call_count, 1)


if __name__ == '__main__':
    unittest.main()
