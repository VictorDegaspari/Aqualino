import React from 'react';
import {RaisedButton, type RaisedButtonProps} from './RaisedButton';

export function PrimaryButton(props: RaisedButtonProps): React.JSX.Element {
  return <RaisedButton {...props} />;
}
