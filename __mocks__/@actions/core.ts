import { jest } from '@jest/globals';

export const debug = jest.fn();
export const error = jest.fn();
export const getBooleanInput = jest.fn().mockReturnValue(false);
export const getInput = jest.fn();
export const setFailed = jest.fn();
