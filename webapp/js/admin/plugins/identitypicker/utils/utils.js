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
 * Gets the CSS class based on percentage value for quality metrics.
 * @param {number|string} percentage - The percentage value (0-100)
 * @returns {string} CSS class name for styling
 * @example
 * const className = getPercentageClass(85); // Returns: 'ip-percentage-high'
 */
export function getPercentageClass(percentage) {
    const percentValue = parseFloat(percentage);
    if (percentValue >= 80) return 'ip-percentage-high';
    if (percentValue >= 30) return 'ip-percentage-medium';
    return 'ip-percentage-low';
}

/**
 * Gets certification information for an attribute.
 * @param {string} attributeKey - The attribute key
 * @param {string} certificationProcess - The certification process code
 * @param {Object} referential - The referential object containing process definitions
 * @param {Object} language - The language object containing translations
 * @returns {Object} Object containing label and description for the certification
 */
export function getCertificationInfo(attributeKey, certificationProcess, referential, language) {
    const process = referential.processList.processus.find(p => p.code === certificationProcess);
    if (process) {
        const attributeCertification = process.attributeCertificationLevels.find(acl => acl.attributeKey === attributeKey);
        if (attributeCertification) {
            return {
                label: process.label,
                description: attributeCertification.level.description
            };
        }
    }
    return {
        label: certificationProcess,
        description: language.certificationUnavailable
    };
}

/**
 * Gets the display value for an attribute based on referential mapping.
 * @param {string} key - The attribute key
 * @param {string} value - The raw value
 * @param {Object} referential - The referential object containing attribute definitions
 * @returns {string} The display value (mapped label or raw value)
 */
export function getDisplayValue(key, value, referential) {
    const attributeKey = referential.attributeKeyList.attributeKeys.find(attr => attr.keyName === key);
    if (attributeKey && attributeKey.values) {
        const matchingValue = attributeKey.values.find(v => v.value === value);
        return matchingValue ? matchingValue.label : value;
    }
    return value;
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

/**
 * Converts a string to title case.
 * @param {string} str - The string to convert
 * @returns {string} The converted string in title case
 * @example
 * toTitleCase('john doe'); // Returns: 'John Doe'
 */
export function toTitleCase(str) {
    if (!str) return '';
    return str.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

/**
 * Removes accents from a string for normalization purposes.
 * @param {string} str - The string to normalize
 * @returns {string} The string without accents
 * @example
 * removeAccents('Héllo Wörld'); // Returns: 'Hello World'
 */
export function removeAccents(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Normalizes a string for comparison by removing HTML, accents, and formatting.
 * @param {string} str - The string to normalize
 * @returns {string} Normalized string (lowercase, no accents, no HTML, trimmed)
 * @example
 * normalizeString('<b>Héllo</b>  Wörld  '); // Returns: 'hello world'
 */
export function normalizeString(str) {
    if (!str) return '';
    // Remove HTML if present
    if (str.includes('<')) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = str;
        str = tempDiv.textContent || tempDiv.innerText || '';
    }
    return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}