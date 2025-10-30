import Button from '@app/components/Common/Button';
import LoadingSpinner from '@app/components/Common/LoadingSpinner';
import PageTitle from '@app/components/Common/PageTitle';
import SensitiveInput from '@app/components/Common/SensitiveInput';
import globalMessages from '@app/i18n/globalMessages';
import { ArrowDownOnSquareIcon } from '@heroicons/react/24/outline';
import type { LastfmSettings } from '@server/lib/settings';
import axios from 'axios';
import { Formik } from 'formik';
import { defineMessages, useIntl } from 'react-intl';
import { useToasts } from 'react-toast-notifications';
import useSWR from 'swr';
import * as Yup from 'yup';

const messages = defineMessages({
  lastfm: 'Last.fm',
  lastfmSettings: 'Last.fm Settings',
  lastfmSettingsDescription:
    'Configure your Last.fm API integration. Overseerr uses Last.fm to provide globally popular music charts and trending artists.',
  apiKey: 'API Key',
  apiKeyTip:
    'Get your API key from the <LastfmApiLink>Last.fm API page</LastfmApiLink>',
  validationApiKey: 'You must provide an API key',
  toastLastfmSettingsSuccess: 'Last.fm settings saved successfully!',
  toastLastfmSettingsFailure: 'Failed to save Last.fm settings.',
});

const SettingsLastfm = () => {
  const intl = useIntl();
  const { addToast } = useToasts();
  const {
    data,
    error,
    mutate: revalidate,
  } = useSWR<LastfmSettings>('/api/v1/settings/lastfm');

  const LastfmSettingsSchema = Yup.object().shape({
    apiKey: Yup.string().nullable(),
  });

  if (!data && !error) {
    return <LoadingSpinner />;
  }

  return (
    <>
      <PageTitle
        title={[
          intl.formatMessage(messages.lastfm),
          intl.formatMessage(globalMessages.settings),
        ]}
      />
      <div className="mb-6">
        <h3 className="heading">
          {intl.formatMessage(messages.lastfmSettings)}
        </h3>
        <p className="description">
          {intl.formatMessage(messages.lastfmSettingsDescription)}
        </p>
      </div>
      <Formik
        initialValues={{
          apiKey: data?.apiKey,
        }}
        validationSchema={LastfmSettingsSchema}
        onSubmit={async (values) => {
          try {
            await axios.post('/api/v1/settings/lastfm', {
              apiKey: values.apiKey,
            } as LastfmSettings);

            addToast(intl.formatMessage(messages.toastLastfmSettingsSuccess), {
              autoDismiss: true,
              appearance: 'success',
            });
          } catch (e) {
            addToast(intl.formatMessage(messages.toastLastfmSettingsFailure), {
              autoDismiss: true,
              appearance: 'error',
            });
          } finally {
            revalidate();
          }
        }}
      >
        {({ errors, touched, handleSubmit, isSubmitting, isValid }) => {
          return (
            <form className="section" onSubmit={handleSubmit}>
              <div className="form-row">
                <label htmlFor="apiKey" className="text-label">
                  {intl.formatMessage(messages.apiKey)}
                  <span className="label-tip">
                    {intl.formatMessage(messages.apiKeyTip, {
                      LastfmApiLink: (msg: React.ReactNode) => (
                        <a
                          href="https://www.last.fm/api/account/create"
                          className="text-white transition duration-300 hover:underline"
                          target="_blank"
                          rel="noreferrer"
                        >
                          {msg}
                        </a>
                      ),
                    })}
                  </span>
                </label>
                <div className="form-input-area">
                  <div className="form-input-field">
                    <SensitiveInput as="field" id="apiKey" name="apiKey" />
                  </div>
                  {errors.apiKey &&
                    touched.apiKey &&
                    typeof errors.apiKey === 'string' && (
                      <div className="error">{errors.apiKey}</div>
                    )}
                </div>
              </div>
              <div className="actions">
                <div className="flex justify-end">
                  <span className="ml-3 inline-flex rounded-md shadow-sm">
                    <Button
                      buttonType="primary"
                      type="submit"
                      disabled={isSubmitting || !isValid}
                    >
                      <ArrowDownOnSquareIcon />
                      <span>
                        {isSubmitting
                          ? intl.formatMessage(globalMessages.saving)
                          : intl.formatMessage(globalMessages.save)}
                      </span>
                    </Button>
                  </span>
                </div>
              </div>
            </form>
          );
        }}
      </Formik>
    </>
  );
};

export default SettingsLastfm;
