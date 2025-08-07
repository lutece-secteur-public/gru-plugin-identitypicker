/**
 * Creates a debounced version of a function that delays invoking the function
 * until after the specified delay has elapsed since the last time it was invoked.
 * @param {Function} func - The function to debounce
 * @param {number} delay - The delay in milliseconds
 * @returns {Function} The debounced function
 * @example
 * const debouncedSearch = debounce(searchFunction, 300);
 * input.addEventListener('input', debouncedSearch);
 */
export function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

/**
 * Retrieves an attribute value from an identity object by its key.
 * @param {Object} identity - The identity object containing attributes array
 * @param {string} key - The attribute key to search for
 * @returns {string} The attribute value if found, empty string otherwise
 * @example
 * const firstName = getAttributeValue(identity, 'first_name');
 */
export function getAttributeValue(identity, key) {
    const attribute = identity.attributes.find(attr => attr.key === key);
    return attribute ? attribute.value : '';
}

/**
 * Gets detailed information about an attribute from the referential data.
 * @param {string} key - The attribute key to look up
 * @param {Object} referential - The referential object containing attribute definitions
 * @returns {Object} An object containing the attribute's label and description
 * @returns {string} returns.label - The human-readable label for the attribute
 * @returns {string} returns.description - The description of the attribute
 * @example
 * const attrInfo = getAttributeInfo('first_name', referential);
 * // Returns: { label: 'First Name', description: 'Person's first name' }
 */
export function getAttributeInfo(key, referential) {
    const attributeKey = referential.attributeKeyList.attributeKeys.find(attr => attr.keyName === key);
    return {
        label: attributeKey ? attributeKey.name : key,
        description: attributeKey ? attributeKey.description : ''
    };
}

/**
 * Formats an ISO date string or Date object to French locale date format.
 * @param {string|Date} isoDate - The ISO date string or Date object to format
 * @returns {string} The formatted date string in DD/MM/YYYY format
 * @example
 * formatDate('2024-03-15T10:30:00Z'); // Returns: '15/03/2024'
 * formatDate(new Date()); // Returns current date in format: 'DD/MM/YYYY'
 */
export function formatDate(isoDate) {
    const date = new Date(isoDate);
    return date.toLocaleDateString('fr-FR');
}