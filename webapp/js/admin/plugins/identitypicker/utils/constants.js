export const ATTRIBUTE_GROUPS = {
    identity: {
      label: 'Identité',
      attributes: ['gender', 'name', 'family_name', 'preferred_username', 'first_name']
    },
    birth: {
      label: 'Naissance',
      attributes: ['birthdate', 'birthcountry', 'birthcountry_code', 'birthplace', 'birthplace_code']
    },
    contact: {
      label: 'Contact',
      attributes: ['login', 'email', 'mobile_phone', 'fixed_phone']
    },
    address: {
      label: 'Adresse',
      attributes: ['address', 'address_detail', 'address_postal_code', 'address_city']
    }
};