import { DataSource } from './commonTypes'
const JOIN_SYMBOL = '_';
const MAGIC_NUMBER = 5;

function deepcopy(data: any): any {
  return JSON.parse(JSON.stringify(data))
}

function isFieldCategory(dataSource: DataSource, fieldName: string): boolean {
  return dataSource.every(record => {
    return typeof record[fieldName] === 'string'
      || typeof record[fieldName] === 'undefined'
      || record[fieldName] === null;
  });
}

function isFieldContinous(dataSource: DataSource, fieldName: string): boolean {
  return dataSource.every(record => {
    return typeof record[fieldName] === 'number'
      || typeof record[fieldName] === 'undefined'
      || record[fieldName] === null;
  });
}

function isFieldNumeric(dataSource: DataSource, fieldName: string): boolean {
  return dataSource.every(record => {
    return !isNaN(record[fieldName])
    || typeof record[fieldName] === 'undefined'
    || record[fieldName] === null;
  })
}

function isFieldTime(dataSource: DataSource, fieldName: string): boolean {
  return dataSource.every(record => {
    return (!isNaN(Date.parse(record[fieldName]))
    && typeof record[fieldName] === 'string'
    && /[0-9]{0,4}-[0-9]{0,2}(-[0-9]{0,2})?/.test(record[fieldName]))
    || typeof record[fieldName] === 'undefined'
    || record[fieldName] === null;
  })
}

interface AggregateProps {
  dataSource: DataSource;
  fields: string[];
  bys: string[];
  method?: string;
}
function aggregate({ dataSource, fields, bys, method = 'sum' }: AggregateProps): DataSource {
  let tmp: DataSource = [];

  for (let by of bys) {
    let map: Map<string, number> = new Map();
    for (let record of dataSource) {
      let key = JSON.stringify(fields.map(field => record[field]));
      if (!map.has(key)) {
        map.set(key, 0);
      }
      map.set(key, map.get(key) + record[by]);
    }
  
    for (let [key, value] of map) {
      let row = {
        index: key,
        [by]: value
      };
      let dims = JSON.parse(key);
      for (let i = 0; i < fields.length; i++) {
        row[fields[i]] = dims[i]
      }

      tmp.push(row)
    }
  }

  let ans: Map<string, any> = new Map();
  for (let record of tmp) {
    if (!ans.has(record.index)) {
      ans.set(record.index, {})
    }
    ans.set(record.index, { ...ans.get(record.index), ...record })
  }
  return [...ans.values()];
}

function memberCount(dataSource: DataSource, field: string): [string, number][] {
  const counter: Map<string, number> = new Map();

  for (let row of dataSource) {
    let member = row[field];
    if (!counter.has(member)) {
      counter.set(member, 0);
    }
    counter.set(member, counter.get(member) + 1);
  }

  return [...counter.entries()];
}

// todo
// sum / count should be a parameter as aggregator.
// function memberSum(dataSource, field) {
//   const counter = new Map();

//   for (let row of dataSource) {
//     let member = row[field];
//     if (!counter.has(member)) {
//       counter.set(member, 0);
//     }
//     counter.set(member, counter.get(member) + 1);
//   }

//   return [...counter.entries()];
// }
interface GroupFieldProps {
  dataSource: DataSource;
  field: string;
  newField: string;
  groupNumber: number;
}
function groupContinousField({ dataSource, field, newField = `${field}(con-group)`, groupNumber }: GroupFieldProps): DataSource {
  // const members = memberCount(dataSource, field);
  // todo: outlier detection
  const values = dataSource.map(item => item[field])
  const max = Math.max(...values); // Number.EPSILON * ;
  const min = Math.min(...values);
  const segWidth = (max - min) / groupNumber;
  let ranges: [number, number][] = [];

  for (let i = 0; i < groupNumber; i++) {
    let left = min + i * segWidth;
    let right = min + (i + 1) * segWidth;
    ranges.push([left, right]);
  }
  ranges[0][0] = -Infinity;
  ranges[ranges.length - 1][1] = Infinity;

  for (let record of dataSource) {
    let range = ranges.find(r => (r[0] <= record[field] && record[field] < r[1]));
    if (typeof range !== 'undefined') {
      record[newField] = `[${range[0]}, ${range[1]})`;
    } else {
      record[newField] = 'null';
    }
  }

  return dataSource;
}

function groupCategoryField({ dataSource, field, newField = `${field}(cat-group)`, groupNumber }: GroupFieldProps): DataSource {
  // auto category should obey Power law distrubution.
  let members = memberCount(dataSource, field);
  members.sort((a, b) => b[1] - a[1]);
  let sum = members.map(v => v[1]);

  groupNumber = members.length;
  for (let i = sum.length - 2; i >= 0; i--) {
    sum[i] = sum[i + 1] + sum[i];
  }
  for (let i = 0; i < members.length - 2; i++) {
    // strict mode
    // if (members[i][1] >= sum[i + 1] && members[i + 1][1] < sum[i + 2]) {
    if (members[i][1] * MAGIC_NUMBER >= sum[i + 1] && members[i + 1][1] / MAGIC_NUMBER < sum[i + 2]) {
      groupNumber = i + 2;
      break;
    }
  }
  // groupNumber = Math.max(Math.round(Math.sqrt(members.length)), groupNumber)
  if (groupNumber === members.length) {
    return dataSource.map(record => {
      return {
        ...record,
        [newField]: record[field]
      }
    });
  }

  let set: Set<string> = new Set()
  for (let i = groupNumber - 1; i < members.length; i++) {
    set.add(members[i][0]);
  }

  for (let record of dataSource) {
    if (set.has(record[field])) {
      record[newField] = 'others';
    } else {
      record[newField] = record[field];
    }
  }
  return dataSource;
}

export {
  deepcopy,
  memberCount,
  groupCategoryField,
  groupContinousField,
  aggregate,
  isFieldCategory,
  isFieldContinous,
  isFieldTime,
  isFieldNumeric,
  JOIN_SYMBOL
}

