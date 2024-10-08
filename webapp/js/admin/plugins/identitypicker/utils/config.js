export const defaultConfig = {
  choices: {
    minSearchLength: 3,
    debounceTime: 300,
  },
  display: {
    modalMaxHeight: 0.9,
  },
  endpoints: {
    permissions: 'rest/identitypicker/api/permissions',
    search: 'rest/identitypicker/api/search',
    identity: 'rest/identitypicker/api/identity',
    rules: 'rest/identitypicker/api/rules',
    history: 'history',
    countries: 'rest/geocodesclient/api/v1/countries',
    cities: 'rest/geocodesclient/api/v1/cities',
  },
  autoFill: false,
  selection:true,
  cuid: null,
  fieldMapping: {},
};