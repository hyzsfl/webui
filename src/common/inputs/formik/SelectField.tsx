import React, { FC } from 'react';
import { MenuItem, useMediaQuery, useTheme } from '@material-ui/core';
import TextField, { Props as TextFieldProps } from './TextField';

interface Option {
  value: string;
  label: string;
}

type Props = TextFieldProps & {
  options: Option[];
};

const SelectField: FC<Props> = ({ options, SelectProps = {}, ...props }) => {
  const theme = useTheme();
  const native = useMediaQuery(theme.breakpoints.down('sm'));
  const sp = {
    native,
    ...SelectProps,
  };
  return (
    <TextField {...props} select SelectProps={sp}>
      {options.map(option =>
        sp.native ? (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ) : (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ),
      )}
    </TextField>
  );
};

export default SelectField;
