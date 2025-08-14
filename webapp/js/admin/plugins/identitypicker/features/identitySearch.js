import { formatDate, getAttributeValue, toTitleCase, removeAccents } from '../utils/utils';

export default class IdentitySearch {
    /**
     * Creates an instance of IdentitySearch.
     * @param {Object} identityPicker - The parent IdentityPicker instance
     */
    constructor(identityPicker) {
        this.identityPicker = identityPicker;
        this.uniqueId = identityPicker.uniqueId;
        this.emailForm = null;
        this.nameForm = null;
    }

    /**
     * Initializes the search view by creating the search forms and setting up event handlers.
     * @async
     * @returns {Promise<void>}
     */
    async initSearchView() {
        const searchContainer = this.identityPicker.searchContainer;
        const searchIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/></svg>`;
        
        searchContainer.innerHTML = `
            <div class="ip-search-option">
                <label>
                    <input type="radio" name="searchType" value="email">
                    <span>${this.identityPicker.rules.language['searchByEmail']}</span>
                </label>
                <label>
                    <input type="radio" name="searchType" value="name" checked>
                    <span>${this.identityPicker.rules.language['searchByName']}</span>
                </label>
            </div>
            <form id="ip-email-form-${this.uniqueId}" style="display: none;">
                <div class="ip-input-group">
                    <label for="ip-email-input-${this.uniqueId}">${this.identityPicker.rules.language['emailPlaceholder']}</label>
                    <input id="ip-email-input-${this.uniqueId}" type="email" name="email" required>
                </div>
                <div class="ip-container-buttons">
                    <button class="ip-button-light ip-button-close" type="button">${this.identityPicker.rules.language['closeButton']}</button>
                    <button type="submit">${searchIcon} ${this.identityPicker.rules.language['searchButton']}</button>
                </div>
            </form>
            <form id="ip-name-form-${this.uniqueId}">
                <div class="ip-input-group">
                    <label for="ip-lastname-input-${this.uniqueId}">${this.identityPicker.rules.language['lastNamePlaceholder']}</label>
                    <input id="ip-lastname-input-${this.uniqueId}" type="text" name="lastName" required>
                </div>
                <div class="ip-input-group">
                    <label for="ip-firstname-input-${this.uniqueId}">${this.identityPicker.rules.language['firstNamePlaceholder']}</label>
                    <input id="ip-firstname-input-${this.uniqueId}" type="text" name="firstName" required>
                </div>
                <div class="ip-input-group">
                    <label for="ip-birthdate-input-${this.uniqueId}">${this.identityPicker.rules.language['birthdatePlaceholder']}</label>
                    <input id="ip-birthdate-input-${this.uniqueId}" type="date" placeholder="${this.identityPicker.rules.language['birthdatePlaceholder']}" name="birthdate" required>
                </div>
                <div class="ip-container-buttons">
                    <button class="ip-button-light ip-button-close" type="button">${this.identityPicker.rules.language['closeButton']}</button>
                    <button type="submit">${searchIcon} ${this.identityPicker.rules.language['searchButton']}</button>
                </div>
            </form>
        `;

        this.emailForm = searchContainer.querySelector(`#ip-email-form-${this.uniqueId}`);
        this.nameForm = searchContainer.querySelector(`#ip-name-form-${this.uniqueId}`);
        this.closeBtns = searchContainer.querySelectorAll('.ip-button-close');

        await this.setupSearchForms();
        await this.setupResultsClickHandler();
    }

    /**
     * Sets up event listeners for search forms and radio buttons.
     * @async
     * @returns {Promise<void>}
     */
    async setupSearchForms() {
        const searchContainer = this.identityPicker.searchContainer;

        searchContainer.querySelectorAll('input[name="searchType"]').forEach(radio => {
            radio.addEventListener('change', () => this.toggleSearchForm(radio.value));
        });

        this.emailForm.addEventListener('submit', (event) => {
            event.preventDefault();
            this.performSearch(new FormData(this.emailForm), 'email');
        });

        this.nameForm.addEventListener('submit', (event) => {
            event.preventDefault();
            this.performSearch(new FormData(this.nameForm), 'name');
        });

        this.closeBtns.forEach(btn => {
            btn.addEventListener('click', () => this.identityPicker.closeModal());
        });
    }

    /**
     * Toggles between email and name search forms.
     * @param {string} searchType - The type of search form to display ('email' or 'name')
     */
    toggleSearchForm(searchType) {
        this.emailForm.style.display = searchType === 'email' ? 'block' : 'none';
        this.nameForm.style.display = searchType === 'name' ? 'block' : 'none';
        this.identityPicker.adjustModalHeight();
    }

    /**
     * Performs an identity search with the provided form data.
     * @async
     * @param {FormData} formData - The form data containing search criteria
     * @param {string} searchType - The type of search being performed ('email' or 'name')
     * @returns {Promise<void>}
     */
    async performSearch(formData, searchType) {
        this.identityPicker.showLoading(this.identityPicker.rules.language['loading']);
        const url = this.buildSearchUrl(formData, searchType);

        try {
            const response = await fetch(url);
            
            if (response.status === 404) {
                this.displayResults([]);
                return;
            }
            
            if (!response.ok) throw new Error(`${this.identityPicker.rules.language['httpError']} ${response.status}`);
            
            const data = await response.json();
            this.displayResults(data);
        } catch (error) {
            console.error(this.identityPicker.rules.language['fetchError'], error);
            this.identityPicker.showMessage('errorMessage', 'error', error.message);
        } finally {
            this.identityPicker.hideLoading();
        }
    }

    /**
     * Builds the search URL based on the form data and search type.
     * @param {FormData} formData - The form data containing search criteria
     * @param {string} searchType - The type of search being performed ('email' or 'name')
     * @returns {string} The constructed search URL
     */
    buildSearchUrl(formData, searchType) {
        const baseUrl = this.identityPicker.config.endpoints.search + '?';
        
        if (searchType === 'email') {
            return `${baseUrl}common_email=${encodeURIComponent(formData.get('email'))}`;
        } else {
            const birthdate = formatDate(formData.get('birthdate'));
            return `${baseUrl}common_lastname=${formData.get('lastName')}&first_name=${formData.get('firstName')}&birthdate=${birthdate}`;
        }
    }

    /**
     * Displays the search results in the results container.
     * @param {Array} results - Array of identity search results
     */
    displayResults(results) {
        const resultsContainer = this.identityPicker.resultsContainer;
        
        if (results.length === 0) {
            if (!this.identityPicker.permissions.creation) {
                this.identityPicker.showMessage('noResults', 'info');
                return;
            }
            
            const searchData = this.getSearchData();
            const searchCriteria = this.buildSearchCriteriaHTML(searchData);
            const noResultsMessage = this.identityPicker.rules.language['noResults'] || 'Aucun résultat trouvé';
            
            resultsContainer.innerHTML = `
                ${searchCriteria}
                <div class="ip-info-message info" style="margin-top: 20px;">
                    <p class="ip-info-message-main">${noResultsMessage}</p>
                </div>
            `;
        } else {
            const searchData = this.getSearchData();
            const searchCriteria = this.buildSearchCriteriaHTML(searchData);
            const resultsHtml = results.map(result => this.createResultItem(result)).join('');
            
            resultsContainer.innerHTML = `
                ${searchCriteria}
                <ul class="ip-results-list">${resultsHtml}</ul>
            `;
        }
        
        this.addActionButtons(results);
        this.identityPicker.showResultsView();
        this.identityPicker.adjustModalHeight();
    }

    /**
     * Builds HTML for displaying search criteria.
     * @param {Object} searchData - The search data object containing search criteria
     * @returns {string} HTML string for search criteria display
     */
    buildSearchCriteriaHTML(searchData) {
        const searchOption = this.identityPicker.searchContainer.querySelector('input[name="searchType"]:checked').value;
        
        if (searchOption === 'email') {
            const emailInput = this.identityPicker.shadowRoot.querySelector(`#ip-email-input-${this.uniqueId}`);
            const email = emailInput ? emailInput.value : '';
            
            if (!email) return '';
            
            return `
                <div class="ip-search-criteria">
                    <p>${this.identityPicker.rules.language['searchCriteriaTitle'] || 'Résultats pour'}:</p>
                    <div class="ip-criteria-tags">
                        <span class="ip-tag ip-tag-criteria">
                            <strong>${this.identityPicker.rules.language['emailPlaceholder']}:</strong> ${email}
                        </span>
                    </div>
                </div>
            `;
        } else {
            if (!searchData.firstName && !searchData.lastName && !searchData.birthdate) return '';
            
            const criteria = [];
            
            if (searchData.lastName) {
                criteria.push(`
                    <span class="ip-tag ip-tag-criteria">
                        <strong>${this.identityPicker.rules.language['lastNamePlaceholder']}:</strong> ${searchData.lastName}
                    </span>
                `);
            }
            
            if (searchData.firstName) {
                criteria.push(`
                    <span class="ip-tag ip-tag-criteria">
                        <strong>${this.identityPicker.rules.language['firstNamePlaceholder']}:</strong> ${searchData.firstName}
                    </span>
                `);
            }
            
            if (searchData.birthdate) {
                criteria.push(`
                    <span class="ip-tag ip-tag-criteria">
                        <strong>${this.identityPicker.rules.language['birthdatePlaceholder']}:</strong> ${formatDate(searchData.birthdate)}
                    </span>
                `);
            }
            
            return `
                <div class="ip-search-criteria">
                    <p>${this.identityPicker.rules.language['searchCriteriaTitle'] || 'Résultats pour'}:</p>
                    <div class="ip-criteria-tags">
                        ${criteria.join('')}
                    </div>
                </div>
            `;
        }
    }

    /**
     * Creates HTML for a single result item.
     * @param {Object} result - The identity result object
     * @returns {string} HTML string for the result item
     */
    createResultItem(result) {
        const searchData = this.getSearchData();
        
        const firstName = getAttributeValue(result, 'first_name');
        const lastName = getAttributeValue(result, 'family_name');
        const preferredUsername = getAttributeValue(result, 'preferred_username');
        const birthdate = getAttributeValue(result, 'birthdate');
        const gender = getAttributeValue(result, 'gender');
        const birthcountry = getAttributeValue(result, 'birthcountry');
        const birthplace = getAttributeValue(result, 'birthplace');
        
        let formattedGender = 'ND';
        if (gender === '1') {
            formattedGender = 'M';
        } else if (gender === '2') {
            formattedGender = 'F';
        }
        
        const formattedLastName = lastName.toUpperCase();
        const formattedFirstName = toTitleCase(firstName);
        const formattedPreferredUsername = preferredUsername ? preferredUsername.toUpperCase() : '';
        
        const searchOption = this.identityPicker.searchContainer.querySelector('input[name="searchType"]:checked').value;
        const isEmailSearch = searchOption === 'email';
        
        const isLastNameApproximate = !isEmailSearch && this.isApproximateMatch(searchData.lastName, lastName);
        const isFirstNameApproximate = !isEmailSearch && this.isApproximateMatch(searchData.firstName, firstName);
        
        const line1 = `${formattedGender} ${isLastNameApproximate ? `<span class="ip-approximate">${formattedLastName}</span>` : formattedLastName} ${isFirstNameApproximate ? `<span class="ip-approximate">${formattedFirstName}</span>` : formattedFirstName}`;
        const line2 = formattedPreferredUsername ? `<div class="ip-preferred-name">${formattedPreferredUsername}</div>` : '';
        
        const birthInfo = [
            birthdate,
            birthcountry,
            birthplace
        ].filter(Boolean).join(' | ');
        
        const monParisBadge = `
            <span class="ip-info-tag ${result.mon_paris_active ? 'ip-tag-success' : 'ip-tag-error'}">
                <strong>${this.identityPicker.rules.language['monParisAccount']}</strong> ${result.mon_paris_active ? this.identityPicker.rules.language['active'] : (result.expiration && result.expiration.delete_date ? `${this.identityPicker.rules.language['inactive']} (Supprimé)` : this.identityPicker.rules.language['inactive'])}
            </span>
        `;
        
        return `
            <li class="ip-result-item" data-customer-id="${result.customer_id}">
                <div class="ip-result-left">
                    <div class="ip-result-header">
                        <h3>${line1}</h3>
                        ${line2}
                    </div>
                    <div class="ip-result-details">
                        <p>${birthInfo}</p>
                    </div>
                </div>
                <div class="ip-result-right">
                    ${monParisBadge}
                </div>
            </li>
        `;
    }


    /**
     * Checks if there's an approximate match between search and result strings.
     * @param {string} search - The search string
     * @param {string} result - The result string to compare against
     * @returns {boolean} True if the match is approximate, false if exact or no match
     */
    isApproximateMatch(search, result) {
        if (!search || !result) return false;
        
        const searchNormalized = removeAccents(search.toLowerCase());
        const resultNormalized = removeAccents(result.toLowerCase());
        
        if (searchNormalized === resultNormalized) return false;
        
        const searchWords = searchNormalized.split(/\s+/);
        const resultWords = resultNormalized.split(/\s+/);
        
        for (const searchWord of searchWords) {
            if (searchWord.length < 3) continue;
            if (!resultNormalized.includes(searchWord)) return true;
        }
        
        for (const resultWord of resultWords) {
            if (resultWord.length < 3) continue;
            if (!searchNormalized.includes(resultWord)) return true;
        }
        
        if (Math.abs(searchNormalized.length - resultNormalized.length) > 3) return true;
        
        return false;
    }

    /**
     * Adds action buttons (compare and/or create) to the results container.
     * @param {Array} results - Array of search results
     */
    addActionButtons(results) {
        const hasCompareButton = results.length > 1;
        const hasCreateButton = this.identityPicker.permissions.creation;
        
        if (!hasCompareButton && !hasCreateButton) return;
        
        const buttonContainer = document.createElement('div');
        buttonContainer.classList.add('ip-container-buttons');
        
        if (hasCompareButton) {
            const compareButton = document.createElement('button');
            compareButton.textContent = this.identityPicker.rules.language['compareButton'];
            compareButton.classList.add('ip-button-light');
            compareButton.addEventListener('click', () => {
                this.identityPicker.identityCompare.initCompareView(results);
                this.identityPicker.showCompareView();
            });
            buttonContainer.appendChild(compareButton);
        }
        
        if (hasCreateButton) {
            const createButton = document.createElement('button');
            createButton.textContent = this.identityPicker.rules.language['createButton'];
            createButton.classList.add('ip-create-button');
            createButton.addEventListener('click', () => this.identityPicker.showIdentityFormView());
            buttonContainer.appendChild(createButton);
        }
        
        this.identityPicker.resultsContainer.appendChild(buttonContainer);
    }


    /**
     * Sets up click handler for result items to show details view.
     * @async
     * @returns {Promise<void>}
     */
    async setupResultsClickHandler() {
        this.identityPicker.resultsContainer.addEventListener('click', (event) => {
            const resultItem = event.target.closest('.ip-result-item');
            if (resultItem) {
                this.identityPicker.showDetailsView(resultItem.dataset.customerId, 'results');
            }
        });
    }


    /**
     * Retrieves the current search form data.
     * @returns {Object} Object containing firstName, lastName, and birthdate values
     */
    getSearchData() {
        const nameForm = this.identityPicker.shadowRoot.querySelector(`#ip-name-form-${this.uniqueId}`);
        return {
            firstName: nameForm.querySelector('input[name="firstName"]').value,
            lastName: nameForm.querySelector('input[name="lastName"]').value,
            birthdate: nameForm.querySelector('input[name="birthdate"]').value,
        };
    }

    /**
     * Resets all search forms to their initial state.
     * @returns {void}
     */
    resetForms() {
        if (this.emailForm) {
            this.emailForm.reset();
        }
        if (this.nameForm) {
            this.nameForm.reset();
        }
        const searchContainer = this.identityPicker.searchContainer;
        const nameRadio = searchContainer.querySelector('input[name="searchType"][value="name"]');
        if (nameRadio) {
            nameRadio.checked = true;
            this.toggleSearchForm('name');
        }
    }

}