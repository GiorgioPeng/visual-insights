import produce, { Draft, setAutoFreeze } from 'immer';
import React, { useState, useMemo, createContext, useContext } from 'react';
import { DataSource, BIField } from './global';
import { Subspace, FieldSummary, ViewSpace } from './service';
import actions, { Test, Actions } from './actions';

setAutoFreeze(false)

export interface GlobalState {
  /**
   * `currentPage` is the current page number of visualization in explore board.
   */
  currentPage: number;
  /**
   * raw data is fetched and parsed data or uploaded data without any other changes.
   * computed value `dataSource` will be calculated 
   */
  rawData: DataSource;
  /**
   * fields contains fields with `dimension` or `measure` type.
   * currently, this kind of type is not computed property unlike 'quantitative', 'nominal'...
   * This is defined by user's purpose or domain knowledge.
   */
  fields: BIField[];
  /**
   * dataSource been cleaned and grouped which is readly for exploration.
   */
  cookedDataSource: DataSource;
  cookedDimensions: string[];
  cookedMeasures: string[];
  /**
   * subspaceList is ordered list by it score.
   */
  // subspaceList: Subspace[]
  /**
   * loading status for some service
   * todo: 
   * manage the loading status in pages intead of globally.
   */
  loading: {
    univariateSummary: boolean;
    subspaceSearching: boolean;
    gallery: boolean;
  };
  
  topK: {
    /**
     * top k percent subspace it will fetch.
     */
    subspacePercentSize: number;
    dimensionSize: number;
  }
  maxGroupNumber: number;
  subspaceList: Subspace[];
  summary: {
    origin: FieldSummary[];
    grouped: FieldSummary[];
  };
  viewSpaces: ViewSpace[]
}

interface GlobalComputed {
  /**
   * `dataSource` is computed data based on fields' property(dimension or measure).
   * sometimes, uploaded data contains contains some measure field but they are parsed into string value, which is raw data.
   * dataSource transform these fields into what they should be for future computation.
   * This is usually happened when a csv file is uploaded.
   */
  dataSource: DataSource;
}
export type StateUpdater<S> = (draftState: Draft<S>) => void

// function createStore<S>(initState: S) {
//   const [state, setState] = useState<S>(initState)

//   return function useGlobalState(): [S, (stateUpdater: StateUpdater<S>) => void] {
//     const updateState = (stateUpdater: StateUpdater<S>) => {
//       const nextState = produce<S>(state, draftState => stateUpdater(draftState))
//       setState(nextState)
//     }
//     return [state, updateState]
//   }
// }

const initState: GlobalState = {
  currentPage: 0,
  fields: [],
  rawData: [],
  cookedDataSource: [],
  cookedDimensions: [],
  cookedMeasures: [],
  loading: {
    univariateSummary: false,
    subspaceSearching: false,
    gallery: false
  },
  topK: {
    subspacePercentSize: 0.3,
    dimensionSize: 0.72
  },
  maxGroupNumber: 4,
  subspaceList: [],
  summary: {
    origin: [],
    grouped: []
  },
  viewSpaces: []
};
type Dispatch<T> = (actionName: string, params: T) => void;
type valueof<T> = T[keyof T]
const GloalStateContext = createContext<[GlobalState, (updater:StateUpdater<GlobalState>) => void, <P extends Test>(actionName: P['name'], params: P['params']) => void]>(null!)

export function GlobalStateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GlobalState>(initState)

  const updateState = (stateUpdater: StateUpdater<GlobalState>) => {
    setState(state => {
      const nextState = produce<GlobalState>(state, draftState => stateUpdater(draftState))
      return nextState;
    })
  }

  const dispatch: <P extends Test>(actionName: P['name'], params: P['params']) => void = (actionName, params) => {
    if (typeof actions[actionName] === 'function') {

      // todo: fix the any type
      
      actions[actionName](state, updateState, params as any);
      // actions['subspaceSearch'](state, updateState, params)
    }
  }



  return (
    <GloalStateContext.Provider value={[state, updateState, dispatch]}>
      {children}
    </GloalStateContext.Provider>
  )
}
export function useGlobalState() {
  return useContext(GloalStateContext)
}