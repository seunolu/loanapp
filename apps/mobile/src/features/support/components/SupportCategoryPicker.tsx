import * as React from 'react';
import { SelectField } from '../../../ui';
import { supportCategoryOptions, type SupportCategory } from '../support.types';

type SupportCategoryPickerProps = {
  value: SupportCategory;
  onChange: (value: SupportCategory) => void;
  errorText?: string;
};

export function SupportCategoryPicker({ value, onChange, errorText }: SupportCategoryPickerProps): React.JSX.Element {
  return (
    <SelectField
      label="Category"
      value={value}
      options={supportCategoryOptions}
      helperText="Choose the option that best matches your issue."
      errorText={errorText}
      onChange={onChange}
    />
  );
}
