import type { HeritageBuildingProperties } from '../lib/heritageBuildings'
import { shtongHeritageUseHistories } from './shtongDatedHistories'
import { shtongHeritageUseHistoriesBatch002 } from './shtongDatedHistoriesBatch002'

export interface ReviewedHeritageUseHistory {
  officialId: string
  expectedName: string
  expectedAddress: string
  name: string
  year: number
  period: string
  note: string
  sourceTitle: string
  sourceUrl: string
}

const histories: ReviewedHeritageUseHistory[] = [{
  officialId: 'sh-fgj-1D003-01',
  expectedName: '汾阳路79号住宅',
  expectedAddress: '汾阳路79号',
  name: '工艺美术研究所',
  year: 1963,
  period: '1963年5月',
  note: '方志记载，当年5月工艺美术家陆续在此工作、传艺，并在二楼设立工艺美术品陈列室。',
  sourceTitle: '上海名建筑志 · 海上“小白宫”：法租界公董局总董府邸（市工艺美术研究所）',
  sourceUrl: 'https://szfz.shtong.gov.cn/difangzhi-front/book/detailNew?oneId=1&bookId=81772&parentNodeId=81786&nodeId=109007&type=-1',
}, ...shtongHeritageUseHistories, ...shtongHeritageUseHistoriesBatch002]

/** Dates describe documented use at this address, rather than catalogue publication or construction. */
export function reviewedUseHistoryForHeritage(properties: Pick<HeritageBuildingProperties, 'officialId' | 'officialName' | 'address' | 'listedName'>) {
  return histories.find(history => history.officialId === properties.officialId
    && history.expectedName === properties.officialName && history.expectedAddress === properties.address
    && history.name === properties.listedName)
}
