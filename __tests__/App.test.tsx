/**
 * @format
 */
import 'react-native';
import React from 'react';
import { act, create } from 'react-test-renderer';
import { expect, it } from '@jest/globals';
import App from '../App';

it('renders the checklist home screen', async () => {
  let tree: ReturnType<typeof create> | undefined;
  await act(async () => {
    tree = create(<App />);
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 50));
  });
  expect(JSON.stringify(tree!.toJSON())).toContain('Deep-link test checklist');
});
