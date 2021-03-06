import { useReducer, Reducer, useEffect, useCallback, useMemo } from 'react';
import { createContainer, useContainer } from 'unstated-next';
import { action } from 'utils/hooks/actions';
import { snakeCase } from 'utils/fetch';
import { stringify } from 'qs';
import { useExecuteTask } from 'plugins/tasks/hooks';
import { toExecuteRequest } from 'plugins/tasks/utils';
import { usePluginContainer } from './api';
import { ListContainer } from './list';
import { Entry, Options } from '../types';

export const enum Constants {
  GET_ENTRIES = '@flexget/list/GET_ENTRIES',
  ADD_ENTRY = '@flexget/list/ADD_ENTRY',
  UPDATE_ENTRY = '@flexget/list/UPDATE_ENTRY',
  UPDATE_ENTRIES = '@flexget/list/UPDATE_ENTRIES',
  REMOVE_ENTRY = '@flexget/list/REMOVE_ENTRY',
  REMOVE_ENTRIES = '@flexget/list/REMOVE_ENTRIES',
  SELECT_ENTRY = '@flexget/list/SELECT_ENTRY',
  UNSELECT_ENTRY = '@flexget/list/UNSELECT_ENTRY',
  CLEAR_SELECTED = '@flexget/list/CLEAR_SELECTED',
}

export const actions = {
  getEntries: (entries: Entry[], totalCount: number) =>
    action(Constants.GET_ENTRIES, { entries, totalCount }),
  addEntry: (entry: Entry) => action(Constants.ADD_ENTRY, entry),
  updateEntry: (entry: Entry) => action(Constants.UPDATE_ENTRY, entry),
  updateEntries: (entries: Entry[]) => action(Constants.UPDATE_ENTRIES, entries),
  removeEntry: (id: number) => action(Constants.REMOVE_ENTRY, id),
  removeEntries: (ids: number[]) => action(Constants.REMOVE_ENTRIES, ids),
  selectEntry: (id: number) => action(Constants.SELECT_ENTRY, id),
  unselectEntry: (id: number) => action(Constants.UNSELECT_ENTRY, id),
  clearSelected: () => action(Constants.CLEAR_SELECTED),
};

type Actions = PropReturnType<typeof actions>;

interface State {
  entries: Entry[];
  totalCount: number;
  selectedIds: ReadonlySet<number>;
}

const entryReducer: Reducer<State, Actions> = (state, act) => {
  switch (act.type) {
    case Constants.GET_ENTRIES:
      return {
        ...act.payload,
        selectedIds: new Set(),
      };
    case Constants.ADD_ENTRY:
      return {
        ...state,
        entries: [act.payload, ...state.entries],
        totalCount: state.totalCount + 1,
      };
    case Constants.REMOVE_ENTRY:
      return {
        ...state,
        totalCount: state.totalCount - 1,
        entries: state.entries.filter(entry => entry.id !== act.payload),
      };
    case Constants.UPDATE_ENTRY:
      return {
        ...state,
        entries: state.entries.map(item => {
          if (item.id === act.payload.id) {
            return act.payload;
          }
          return item;
        }),
      };
    case Constants.UPDATE_ENTRIES: {
      const entryMap = act.payload.reduce(
        (obj, entry) => ({
          ...obj,
          [entry.id]: entry,
        }),
        {},
      );
      return {
        ...state,
        entries: state.entries.map(item => entryMap[item.id] ?? item),
        selectedIds: new Set(),
      };
    }
    case Constants.REMOVE_ENTRIES: {
      const idSet = new Set(act.payload);

      return {
        ...state,
        totalCount: state.totalCount - 1,
        entries: state.entries.filter(entry => !idSet.has(entry.id)),
        selectedIds: new Set(),
      };
    }
    case Constants.SELECT_ENTRY:
      return {
        ...state,
        selectedIds: new Set([...state.selectedIds, act.payload]),
      };
    case Constants.UNSELECT_ENTRY:
      return {
        ...state,
        selectedIds: new Set([...state.selectedIds].filter(id => id !== act.payload)),
      };
    case Constants.CLEAR_SELECTED:
      return {
        ...state,
        selectedIds: new Set(),
      };
    default:
      return state;
  }
};

export const EntryContainer = createContainer(() => {
  return useReducer(entryReducer, { entries: [], totalCount: 0, selectedIds: new Set<number>() });
});

export const useGetEntries = (options: Options) => {
  const [, dispatch] = useContainer(EntryContainer);
  // NOTE: Material-UI Table Pagination uses 0 based indexing for pages, so we add
  // one here to account for that
  const query = stringify(snakeCase({ ...options, page: options.page + 1 }));

  const [{ listId }] = useContainer(ListContainer);

  const {
    api: {
      entry: { useGet },
    },
  } = usePluginContainer();

  const [state, request] = useGet(listId, query);

  useEffect(() => {
    if (!listId) {
      return;
    }
    const fn = async () => {
      const resp = await request();
      if (resp.ok) {
        dispatch(
          actions.getEntries(resp.data, parseInt(resp.headers.get('total-count') ?? '0', 10)),
        );
      }
    };
    fn();
  }, [dispatch, listId, request]);

  return state;
};

export const useAddEntry = () => {
  const [{ listId }] = useContainer(ListContainer);
  const [, dispatch] = useContainer(EntryContainer);
  const {
    api: {
      entry: { useAdd },
    },
  } = usePluginContainer();
  const [state, request] = useAdd(listId);

  const addEntry = useCallback(
    async (req: Record<string, string>) => {
      const resp = await request(req);
      if (resp.ok) {
        dispatch(actions.addEntry(resp.data));
      }
      return resp;
    },
    [dispatch, request],
  );

  return [state, addEntry] as const;
};

const useRemoveSingleEntry = (entryId?: number) => {
  const [{ listId }] = useContainer(ListContainer);
  const [, dispatch] = useContainer(EntryContainer);
  const {
    api: {
      entry: { useRemove },
    },
  } = usePluginContainer();
  const [state, request] = useRemove(listId, entryId);

  const removeEntry = useCallback(async () => {
    const resp = await request();
    if (resp.ok && entryId) {
      dispatch(actions.removeEntry(entryId));
    }

    return resp;
  }, [dispatch, entryId, request]);

  return [state, removeEntry] as const;
};

const useRemoveBulkEntry = () => {
  const [{ listId }] = useContainer(ListContainer);
  const [{ selectedIds }, dispatch] = useContainer(EntryContainer);
  const {
    api: {
      entry: { useRemoveBulk },
    },
  } = usePluginContainer();
  const [state, request] = useRemoveBulk(listId);

  const removeEntry = useCallback(async () => {
    const ids = [...selectedIds];
    const resp = await request({ ids });
    if (resp.ok) {
      dispatch(actions.removeEntries(ids));
    }

    return resp;
  }, [dispatch, request, selectedIds]);

  return [state, removeEntry] as const;
};

export const useRemoveEntry = (entryId?: number) => {
  const singleState = useRemoveSingleEntry(entryId);
  const bulkState = useRemoveBulkEntry();

  return entryId ? singleState : bulkState;
};

export const useInjectEntry = (entryId?: number) => {
  const [{ selectedIds, entries }] = useContainer(EntryContainer);
  const [remove, removeEntry] = useRemoveEntry(entryId);
  const [execute, executeTask] = useExecuteTask();

  const entryMap = useMemo(
    () =>
      entries.reduce(
        (obj: Record<number, Entry>, entry) => ({
          ...obj,
          [entry.id]: entry,
        }),
        {},
      ),
    [entries],
  );

  const inject = useMemo(
    () => (entryId ? [entryId] : [...selectedIds]).map(id => toExecuteRequest(entryMap[id]?.entry)),
    [entryId, entryMap, selectedIds],
  );

  const injectEntry = useCallback(
    async (task: string) => {
      const executeResponse = await executeTask({ tasks: [task], inject });
      if (!executeResponse.ok) {
        return executeResponse;
      }
      return removeEntry();
    },
    [executeTask, inject, removeEntry],
  );

  return [
    {
      error: remove.error ?? execute.error,
      loading: remove.loading || execute.loading,
    },
    injectEntry,
  ] as const;
};

export const useEntryBulkSelect = () => {
  const [{ selectedIds }, dispatch] = useContainer(EntryContainer);

  const selectEntry = useCallback((id: number) => dispatch(actions.selectEntry(id)), [dispatch]);
  const unselectEntry = useCallback((id: number) => dispatch(actions.unselectEntry(id)), [
    dispatch,
  ]);

  const clearSelected = useCallback(() => dispatch(actions.clearSelected()), [dispatch]);

  return [selectedIds, { selectEntry, unselectEntry, clearSelected }] as const;
};
