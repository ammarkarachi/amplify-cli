import uuid from 'uuid';
import { toBeIAMRoleWithArn, toHaveValidPolicyConditionMatchingIdpId, toBeAS3Bucket } from './aws-matchers';
expect.extend({ toBeIAMRoleWithArn });
expect.extend({ toHaveValidPolicyConditionMatchingIdpId });
expect.extend({ toBeAS3Bucket });

// tslint:disable-next-line: no-magic-numbers
const JEST_TIMEOUT = 1000 * 60 * 60; // 1 hour

jest.setTimeout(JEST_TIMEOUT);
global.beforeEach(() => {
  process.env['WORKFLOW_ID'] = uuid.v4();
});
global.afterAll(() => {
  delete process.env.WORKFLOW_ID;
});
