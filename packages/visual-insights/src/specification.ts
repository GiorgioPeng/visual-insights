import { DataSource, FieldType, Field, FieldImpurity, Specification, View } from './commonTypes';
import fieldsAnalysis from './fieldAnalysis';
import {
  // isFieldCategory,
  // isFieldContinous,
  memberCount
} from './utils';
interface VisualElements {
  position: number;
  color: number;
  size: number;
  shape: number;
  opacity: number;
  facets: number;
  page: number;
  filter: number;
  highFacets: number
}
function getVisualElements (): VisualElements {
  return {
    position: 2,
    color: 1,
    size: 1,
    shape: 1,
    opacity: 1,
    facets: 2,
    page: 1,
    filter: 1,
    highFacets: Infinity
  }
}

const geomTypes = {
  interval: [0, 20],
  line: [21, Infinity],
  area: [21, Infinity],
  point: [0, 10000000],
  path: [0, 100],
  density: [1001, Infinity]
}
interface LabelField extends Field {
  choosen: boolean;
}

function findBestField (type: FieldType, fieldRankList: LabelField[]): LabelField | false {
  for (let i = fieldRankList.length - 1; i >=0; i--) {
    if (fieldRankList[i].type === type && !fieldRankList[i].choosen) {
      return fieldRankList[i]
    }
  }
  return false;
}


function aestheticMapping (dimScores: FieldImpurity[]) {
  let spec: Specification = {};
  let visualElements = getVisualElements();
  let fieldRankList = dimScores.map(field => {
    return {
      name: field[0],
      type: field[3].type,
      choosen: false
    }
  });
  const priority: [FieldType, string[]][] = [
    ['quantitative', ['position', 'size', 'opacity', 'color', 'page', 'filter', 'hightFacets']],
    ['ordinal', ['position', 'opacity' ,'color', 'facets', 'size', 'page', 'filter', 'highFacets']],
    ['nominal', ['position', 'color', 'facets', 'shape', 'page', 'filter', 'hightFacets']],
    ['temporal', ['position', 'page', 'filter']]
  ];
  let fieldLeft = fieldRankList.length;
  for (let typeIndex = 0; typeIndex < priority.length && fieldLeft > 0; typeIndex++) {
    let type = priority[typeIndex][0];
    let channelList = priority[typeIndex][1];
    
    for (let i = 0; i < channelList.length && fieldLeft > 0; i++) {
      let channel = channelList[i];

      let field: LabelField | false;
      while (visualElements[channel] > 0 && (field = findBestField(type, fieldRankList))) {
        if (typeof spec[channel] === 'undefined') {
          spec[channel] = []
        }
        spec[channel].push(field.name);
        visualElements[channel]--;
        fieldLeft--;
        field.choosen = true;
      }
    }
  }
  return spec
}

function specificationWithFieldsAnalysisResult (dimScores: FieldImpurity[], aggData: DataSource, measures: string[]): View {
  let viewDimensions = dimScores.map(dim => dim[0]).filter(dim => !measures.includes(dim));

  let spec = aestheticMapping(dimScores);
  // todo: design a better rule for choosing geom type.
  if (spec.position.length === 2) {
    if ((viewDimensions.includes(spec.position[0]) && measures.includes(spec.position[1])) ||
      (viewDimensions.includes(spec.position[1]) && measures.includes(spec.position[0]))) {
      const dimIndex = viewDimensions.includes(spec.position[0]) ? 0 : 1;
      const dim = spec.position[dimIndex];
      const mea = spec.position[(dimIndex + 1) % 2];
      spec.position = [dim, mea];
      const dimMembers = memberCount(aggData, dim);
      spec.geomType = ['interval', 'line', 'area'].filter(geom => {
        return dimMembers.length >= geomTypes[geom][0] && dimMembers.length <= geomTypes[geom][1];
      });
      let x = dimScores.find(dim => dim[0]=== spec.position[0])[3];
      let y = dimScores.find(dim => dim[0] === spec.position[1])[3];
      if (x.type === 'nominal' || y.type === 'nominal') {
        spec.geomType = ['interval']
      }
    } else {
      // ['point', 'path', 'heatmap']
      spec.geomType = ['point', 'density'].filter(geom => {
        return aggData.length >= geomTypes[geom][0] && aggData.length <= geomTypes[geom][1];
      });
    }
  }
  return { schema: spec, aggData };
}
function specification (dataSource: DataSource, dimensions: string[], measures: string[]): View {
  const { dimScores, aggData } = fieldsAnalysis(dataSource, dimensions, measures);
  return  specificationWithFieldsAnalysisResult(dimScores, aggData, measures);

}

export default specification;

export { specificationWithFieldsAnalysisResult }
