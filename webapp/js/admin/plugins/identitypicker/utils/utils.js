export function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  }
  
  export function getAttributeValue(identity, key) {
    const attribute = identity.attributes.find(attr => attr.key === key);
    return attribute ? attribute.value : '';
  }

  export function  getAttributeInfo(key, referential) {
    const attributeKey = referential.attributeKeyList.attributeKeys.find(attr => attr.keyName === key);
    return {
      label: attributeKey ? attributeKey.name : key,
      description: attributeKey ? attributeKey.description : ''
    };
  }
  
  export function formatDate(isoDate) {
    const date = new Date(isoDate);
    return date.toLocaleDateString('fr-FR');
  }