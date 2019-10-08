import { analysisDimensions } from 'visual-insights'
import { RequestHandler } from 'express';
interface CombineFieldsRequest {
  dataSource: any[];
  dimensions: string[];
  measures: string[];
  operator: 'sum' | 'mean' | 'count';
  topKPercent: number
}
const combineFields: RequestHandler = (req, res) => {
  console.log('[combine fields]')
  const { dataSource, dimensions, measures, operator, topKPercent = 0.3 } = req.body as CombineFieldsRequest;
  let impurityList = analysisDimensions(dataSource, dimensions, measures, operator).map(dimReport => {
    let sum = 0;
    for (let key in dimReport[1]) {
      sum += dimReport[1][key];
    }
    return {
      ...dimReport,
      score: sum
    }
  });
  impurityList.sort((a, b) => a.score - b.score);
  let end = Math.round(topKPercent * impurityList.length)
  res.json({
    success: true,
    data: impurityList.slice(0, end).map(view => {
      return {
        score: view.score,
        dimensions: view[0],
        measures: measures.map(mea => {
          return {
            name: mea,
            value: view[1][mea]
          }
        }),
        correlationMatrix: view[2]
      }
    })
  })
}

export default combineFields;