// @flow
import * as React from 'react';
import styled from 'styled-components';
import { t } from 'ttag';
import uuidv4 from 'uuid/v4';

import type { Feature } from '../../../lib/Feature';
import { accessibilityCloudFeatureFrom } from '../../../lib/Feature';
import type { SourceWithLicense } from '../../../app/PlaceDetailsProps';
import { PrimaryButton } from '../../Button';
import AppContext from '../../../AppContext';
import { Dots } from 'react-activity';
import { accessibilityCloudFeatureCache } from '../../../lib/cache/AccessibilityCloudFeatureCache';
import colors from '../../../lib/colors';

function hasKoboSubmission(feature: Feature | null) {
  const acFeature = accessibilityCloudFeatureFrom(feature);
  if (!acFeature) {
    return false;
  }

  const ids = acFeature.properties && acFeature.properties.ids;
  if (ids) {
    for (const externalId of ids) {
      if (externalId.provider === 'koboSubmission') {
        return true;
      }
    }
  }
  return false;
}

type Props = {
  className?: string,
  featureId: string | null,
  feature: Feature | null,
  sources: SourceWithLicense[] | null,
};

type State = 'Idle' | 'CreatingLink' | 'Error';

const validLinkDuration = 1000 * 60 * 3; // 3 minutes

function openSurveyLink(url: string) {
  window.open(url, '_blank');
}

const EditFormSubmissionButton = (props: Props) => {
  const primarySource =
    props.sources && props.sources.length > 0 ? props.sources[0].source : undefined;
  const [state, setState] = React.useState<State>('Idle');
  const [error, setError] = React.useState<string | null>(null);
  const resolvedEditUrl = React.useRef<string | null>(null);

  const appContext = React.useContext(AppContext);
  const tokenString = appContext.app.tokenString;
  const baseUrl = appContext.baseUrl;
  const placeId = props.featureId;

  const createOrOpenEditLink = React.useCallback(() => {
    if (!placeId) {
      return;
    }

    if (resolvedEditUrl.current) {
      openSurveyLink(resolvedEditUrl.current);
      return;
    }

    setState('CreatingLink');
    const uniqueSurveyId = encodeURI(uuidv4());
    accessibilityCloudFeatureCache
      .getEditPlaceSubmissionUrl(
        placeId,
        `${baseUrl}/contribution-thanks/${placeId}?uniqueSurveyId=${uniqueSurveyId}`,
        tokenString
      )
      .then(uri => {
        console.log(uri);
        resolvedEditUrl.current = uri;
        setState('Idle');
        setTimeout(() => (resolvedEditUrl.current = null), validLinkDuration);
        openSurveyLink(uri);
      })
      .catch(error => {
        setState('Error');
        resolvedEditUrl.current = null;
        setError(typeof error === 'object' ? error.reason : String(error));
      });
  }, [setState, setError, placeId, baseUrl, tokenString]);

  const hasDefaultForm = primarySource && primarySource.defaultKoboForm;
  const hasSubmission = hasKoboSubmission(props.feature);
  const canEditSubmission = hasDefaultForm || hasSubmission;
  if (!canEditSubmission) {
    return null;
  }

  return (
    <section className={props.className}>
      <PrimaryButton disabled={state !== 'Idle'} onClick={createOrOpenEditLink}>
        {t`Add more details`}
        {state === 'CreatingLink' && <Dots className="loadingIndicator" color={'white'} />}
      </PrimaryButton>
      {state === 'Error' && (
        <div className="errorBlock">
          <p>{t`Sorry, something went wrong! Please retry later, or write an email to bugs@wheelmap.org if the issue persists.`}</p>
          <p>{error}</p>
        </div>
      )}
    </section>
  );
};

export default styled(EditFormSubmissionButton)`
  margin-top: 12px;
  width: 100%;

  .loadingIndicator {
    margin-left: 12px;
  }

  .errorBlock {
    background: ${colors.negativeColor};
    padding: 12px;
    color: white;
    border-radius: 4px;
    margin-top: 4px;
  }
`;
