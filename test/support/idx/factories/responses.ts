/* eslint-disable max-len */
import { Factory } from 'fishery';
import { IdxResponse } from '../../../../lib/idx/types/idx-js';
import {
  IdentifyRemediationFactory,
  IdentifyWithPasswordRemediationFactory,
  SelectAuthenticatorRemediationFactory,
  VerifyPasswordRemediationFactory
} from './remediations';

interface MockedIdxResponseTransientParams {
  nextResponse?: IdxResponse;
  idxVersion?: string;
  stateHandle?: string;
}

export const IdxResponseFactory = Factory.define<IdxResponse, MockedIdxResponseTransientParams>(({
  transientParams
}) => {
  return {
    proceed: () => Promise.resolve(transientParams.nextResponse),
    neededToProceed: [],
    rawIdxState: {
      version: transientParams.idxVersion,
      stateHandle: transientParams.stateHandle,
    },
    actions: {},
    toPersist: {},
    context: {}
  };
});

export const SuccessResponseFactory = IdxResponseFactory.params({
  interactionCode: 'idx-interactionCode'
});

export const IdentifyResponseFactory = IdxResponseFactory.params({
  neededToProceed: [
    IdentifyRemediationFactory.build()
  ]
});

export const IdentifyWithPasswordResponseFactory = IdentifyResponseFactory.params({
  neededToProceed: [
    IdentifyWithPasswordRemediationFactory.build()
  ]
});

export const VerifyPasswordResponseFactory = IdxResponseFactory.params({
  neededToProceed: [
    VerifyPasswordRemediationFactory.build()
  ]
});

export const SelectAuthenticatorResponseFactory = IdxResponseFactory.params({
  neededToProceed: [
    SelectAuthenticatorRemediationFactory.build()
  ]
});
