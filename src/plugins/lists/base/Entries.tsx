import React, { useCallback, useMemo, FC } from 'react';
import { useContainer } from 'unstated-next';
import { Direction } from 'utils/query';
import { useInjectContent, useSetMenuProps } from 'core/layout/AppBar/hooks';
import { useMergeState, useOverlayState } from 'utils/hooks';
import { Delete } from '@material-ui/icons';
import { OverflowMenuProps } from 'core/layout/AppBar/OverflowMenu';
import EntryList from './EntryList';
import EntryListHeader from './EntryListHeader';
import { Options } from './types';
import { ListContainer, useGetLists, actions } from './hooks/list';
import { EntryContainer } from './hooks/entry';
import AddFab from './AddFab';
import TabList from './TabList';
import RemoveListDialog from './RemoveListDialog';

const Entries: FC = () => {
  const [options, setOptions] = useMergeState<Options>({
    page: 0,
    perPage: 30,
    sortBy: 'added',
    order: Direction.Desc,
  });

  const setPage = useCallback((n: number) => setOptions({ page: n }), [setOptions]);

  const [{ lists, listId }, dispatch] = useContainer(ListContainer);

  const handleChange = useCallback(
    (_, selected: number) => {
      dispatch(actions.selectList(selected));
      return setPage(0);
    },
    [dispatch, setPage],
  );
  const [removeIsOpen, { open: removeOpen, close: removeClose }] = useOverlayState();
  const content = useMemo(
    () => <TabList handleChange={handleChange} listId={listId} lists={lists} />,
    [handleChange, listId, lists],
  );

  const menuProps: OverflowMenuProps[] = useMemo(
    () => [
      {
        Icon: Delete,
        name: 'Remove List',
        onClick: removeOpen,
      },
    ],
    [removeOpen],
  );

  useGetLists();

  useInjectContent(content);
  useSetMenuProps(menuProps);

  return (
    <EntryContainer.Provider>
      <EntryListHeader setOptions={setOptions} options={options} />
      <EntryList options={options} />
      <AddFab />
      <RemoveListDialog open={removeIsOpen} onClose={removeClose} />
    </EntryContainer.Provider>
  );
};

export default Entries;