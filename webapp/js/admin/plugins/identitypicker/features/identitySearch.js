import { formatDate } from '../utils/utils';

export default class IdentitySearch {
  constructor(identityPicker) {
    this.identityPicker = identityPicker;
    this.uniqueId = identityPicker.uniqueId;
    this.emailForm = null;
    this.nameForm = null;
  }

  async initSearchView() {
    const searchContainer = this.identityPicker.searchContainer;
    const searchIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-top: -2px;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`;

    searchContainer.innerHTML = `
      <div class="ip-search-option">
        <label>
          <input type="radio" name="searchType" value="email">
          <span>${this.identityPicker.rules.language.searchByEmail}</span>
        </label>
        <label>
          <input type="radio" name="searchType" value="name" checked>
          <span>${this.identityPicker.rules.language.searchByName}</span>
        </label>
      </div>
      <form id="ip-email-form-${this.uniqueId}" style="display: none;">
        <div class="ip-input-group">
          <label for="ip-email-input-${this.uniqueId}">${this.identityPicker.rules.language.emailPlaceholder}</label>
          <input id="ip-email-input-${this.uniqueId}" type="email" name="email" required>
        </div>
        <div class="ip-container-buttons">
          <button class="ip-button-light" type="button">${this.identityPicker.rules.language.closeButton}</button>
          <button type="submit">${searchIcon} ${this.identityPicker.rules.language.searchButton}</button>
        </div>
      </form>
      <form id="ip-name-form-${this.uniqueId}">
        <div class="ip-input-group">
          <label for="ip-lastname-input-${this.uniqueId}">${this.identityPicker.rules.language.lastNamePlaceholder}</label>
          <input id="ip-lastname-input-${this.uniqueId}" type="text" name="lastName" required>
        </div>
        <div class="ip-input-group">
          <label for="ip-firstname-input-${this.uniqueId}">${this.identityPicker.rules.language.firstNamePlaceholder}</label>
          <input id="ip-firstname-input-${this.uniqueId}" type="text" name="firstName" required>
        </div>
        <div class="ip-input-group">
          <label for="ip-birthdate-input-${this.uniqueId}">${this.identityPicker.rules.language.birthdatePlaceholder}</label>
          <input id="ip-birthdate-input-${this.uniqueId}" type="date" placeholder="${this.identityPicker.rules.language.birthdatePlaceholder}" name="birthdate" required>
        </div>
        <div class="ip-container-buttons">
          <button class="ip-button-light ip-button-close" type="button">${this.identityPicker.rules.language.closeButton}</button>
          <button type="submit">${searchIcon} ${this.identityPicker.rules.language.searchButton}</button>
        </div>
      </form>
    `;

    this.emailForm = searchContainer.querySelector(`#ip-email-form-${this.uniqueId}`);
    this.nameForm = searchContainer.querySelector(`#ip-name-form-${this.uniqueId}`);
    this.closeBtn = searchContainer.querySelector('.ip-button-close');
    await this.setupSearchForms();
    await this.setupResultsClickHandler();
  }

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

        this.closeBtn.addEventListener('click', () => this.identityPicker.closeModal());
    }

    toggleSearchForm(searchType) {
        this.emailForm.style.display = searchType === 'email' ? 'block' : 'none';
        this.nameForm.style.display = searchType === 'name' ? 'block' : 'none';
        this.identityPicker.adjustModalHeight();
    }

    async performSearch(formData, searchType) {
        this.identityPicker.showLoading(this.identityPicker.rules.language.loading);
        const url = this.buildSearchUrl(formData, searchType);

        try {
            const response = await fetch(url);
            if (response.status === 404) {
                this.identityPicker.showMessage('noResults', 'info');
                return;
            }
            if (!response.ok) throw new Error(`${this.identityPicker.rules.language.httpError} ${response.status}`);

            const data = await response.json();
            this.displayResults(data);
        } catch (error) {
            console.error(this.identityPicker.rules.language.fetchError, error);
            this.identityPicker.showMessage('errorMessage', 'error', error.message);
        } finally {
            this.identityPicker.hideLoading();
        }
    }

    buildSearchUrl(formData, searchType) {
        const baseUrl = this.identityPicker.config.endpoints.search + '?';

        if (searchType === 'email') {
            return `${baseUrl}common_email=${encodeURIComponent(formData.get('email'))}`;
        } else {
            const birthdate = formatDate(formData.get('birthdate'));
            return `${baseUrl}common_lastname=${formData.get('lastName')}&first_name=${formData.get('firstName')}&birthdate=${birthdate}`;
        }
    }

    displayResults(results) {
        const resultsContainer = this.identityPicker.resultsContainer;

        if (results.length === 0) {
            this.identityPicker.showMessage('noResults', 'info');
            return;
        }

        const searchData = this.getSearchData();
        const searchCriteria = this.buildSearchCriteriaHTML(searchData);

        const resultsHtml = results.map(result => this.createResultItem(result)).join('');

        resultsContainer.innerHTML = `
            ${searchCriteria}
            <ul class="ip-results-list">${resultsHtml}</ul>
        `;

        this.addActionButtons(results);
        this.identityPicker.showResultsView();
        this.identityPicker.adjustModalHeight();
    }

    buildSearchCriteriaHTML(searchData) {
        const searchOption = this.identityPicker.searchContainer.querySelector('input[name="searchType"]:checked').value;

        if (searchOption === 'email') {
            const emailInput = document.getElementById(`ip-email-input-${this.uniqueId}`);
            const email = emailInput ? emailInput.value : '';
            if (!email) return '';

            return `
                <div class="ip-search-criteria">
                    <p>${this.identityPicker.rules.language.searchCriteriaTitle || 'Résultats pour'}:</p>
                    <div class="ip-criteria-tags">
                        <span class="ip-tag ip-tag-criteria">
                            <strong>${this.identityPicker.rules.language.emailPlaceholder}:</strong> ${email}
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
                        <strong>${this.identityPicker.rules.language.lastNamePlaceholder}:</strong> ${searchData.lastName}
                    </span>
                `);
            }
            if (searchData.firstName) {
                criteria.push(`
                    <span class="ip-tag ip-tag-criteria">
                        <strong>${this.identityPicker.rules.language.firstNamePlaceholder}:</strong> ${searchData.firstName}
                    </span>
                `);
            }
            if (searchData.birthdate) {
                criteria.push(`
                    <span class="ip-tag ip-tag-criteria">
                        <strong>${this.identityPicker.rules.language.birthdatePlaceholder}:</strong> ${formatDate(searchData.birthdate)}
                    </span>
                `);
            }

            return `
                <div class="ip-search-criteria">
                    <p>${this.identityPicker.rules.language.searchCriteriaTitle || 'Résultats pour'}:</p>
                    <div class="ip-criteria-tags">
                        ${criteria.join('')}
                    </div>
                </div>
            `;
        }
    }

    createResultItem(result) {
        const searchData = this.getSearchData();
        
        const firstName = this.getAttributeValue(result, 'first_name');
        const lastName = this.getAttributeValue(result, 'family_name');
        const preferredUsername = this.getAttributeValue(result, 'preferred_username');
        const birthdate = this.getAttributeValue(result, 'birthdate');
        const gender = this.getAttributeValue(result, 'gender');
        const birthcountry = this.getAttributeValue(result, 'birthcountry');
        const birthplace = this.getAttributeValue(result, 'birthplace');
        
        let formattedGender = 'ND';
        if (gender === '1') {
            formattedGender = 'M';
        } else if (gender === '2') {
            formattedGender = 'F';
        }
        const formattedLastName = lastName.toUpperCase();
        const formattedFirstName = this.toTitleCase(firstName);
        const formattedPreferredUsername = preferredUsername ? preferredUsername.toUpperCase() : '';
        
        const isLastNameApproximate = this.isApproximateMatch(searchData.lastName, lastName);
        const isFirstNameApproximate = this.isApproximateMatch(searchData.firstName, firstName);
        
        const line1 = `${formattedGender} ${isLastNameApproximate ? 
            `<span class="ip-approximate">${formattedLastName}</span>` : 
            formattedLastName} ${isFirstNameApproximate ? 
            `<span class="ip-approximate">${formattedFirstName}</span>` : 
            formattedFirstName}`;
        
        const line2 = formattedPreferredUsername ? 
            `<div class="ip-preferred-name">${formattedPreferredUsername}</div>` : '';
        
        const birthInfo = [
            birthdate,
            birthcountry,
            birthplace
        ].filter(Boolean).join(' | ');
        
        
        const monParisBadge = `
            <span class="ip-info-tag ${result.mon_paris_active ? 'ip-tag-success' : 'ip-tag-error'}">
                <strong>Mon Paris</strong> ${result.mon_paris_active ? 'Actif' : 'Inactif'}
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

    toTitleCase(str) {
        if (!str) return '';
        return str.split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    }

    isApproximateMatch(search, result) {
        if (!search || !result) return false;
        
        const searchNormalized = this.removeAccents(search.toLowerCase());
        const resultNormalized = this.removeAccents(result.toLowerCase());
        
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

    addActionButtons(results) {
        if (results.length === 0 && !this.identityPicker.permissions.creation) return;

        const buttonContainer = document.createElement('div');
        buttonContainer.classList.add('ip-container-buttons');

        if (results.length > 1) {
            const compareButton = document.createElement('button');
            compareButton.textContent = this.identityPicker.rules.language.compareButton;
            compareButton.classList.add('ip-button-light');
            compareButton.addEventListener('click', () => {
                this.identityPicker.indentityCompare.initCompareView(results);
                this.identityPicker.showCompareView();
            });
            buttonContainer.appendChild(compareButton);
        }

        if (this.identityPicker.permissions.creation) {
            const createButton = document.createElement('button');
            createButton.textContent = this.identityPicker.rules.language.createButton;
            createButton.classList.add('ip-create-button');
            createButton.addEventListener('click', () => this.identityPicker.showIdentityFormView());
            buttonContainer.appendChild(createButton);
        }

        this.identityPicker.resultsContainer.appendChild(buttonContainer);
    }

    getAttributeValue(result, key) {
        const attribute = result.attributes.find(attr => attr.key === key);
        return attribute ? attribute.value : '';
    }

    async setupResultsClickHandler() {
        this.identityPicker.resultsContainer.addEventListener('click', (event) => {
            const resultItem = event.target.closest('.ip-result-item');
            if (resultItem) {
                this.identityPicker.showDetailsView(resultItem.dataset.customerId, 'results');
            }
        });
    }

    getBadgeColorClass(percentage) {
        if (percentage >= 80) return 'ip-tag-success';
        if (percentage >= 50) return 'ip-tag-warning';
        return 'ip-tag-error';
    }

    getColorClass(percentage) {
        if (percentage >= 80) return 'ip-high';
        if (percentage >= 50) return 'ip-medium';
        return 'ip-low';
    }

    getSearchData() {
        const nameForm = document.getElementById(`ip-name-form-${this.uniqueId}`);
        return {
            firstName: nameForm.querySelector('input[name="firstName"]').value,
            lastName: nameForm.querySelector('input[name="lastName"]').value,
            birthdate: nameForm.querySelector('input[name="birthdate"]').value,
        };
    }

    removeAccents(str) {
        return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }

    highlightDifferences(search, result) {
        if (!search || !result) return result;

        let searchNormalized = this.removeAccents(search.toLowerCase());
        let resultNormalized = this.removeAccents(result.toLowerCase());

        let highlightedResult = '';
        let searchIndex = 0;
        let inHighlight = false;

        for (let i = 0; i < result.length; i++) {
            if (searchIndex < searchNormalized.length && resultNormalized[i] === searchNormalized[searchIndex]) {
                if (inHighlight) {
                    highlightedResult += '</span>';
                    inHighlight = false;
                }
                highlightedResult += result[i];
                searchIndex++;
            } else {
                if (!inHighlight) {
                    highlightedResult += '<span class="ip-highlight">';
                    inHighlight = true;
                }
                highlightedResult += result[i];
            }
        }

        if (inHighlight) {
            highlightedResult += '</span>';
        }

        return highlightedResult;
    }

    highlightLastNameDifferences(search, lastName, preferredUsername) {
        const lastNameMatch = this.highlightDifferences(search, lastName);
        const preferredUsernameMatch = preferredUsername ? this.highlightDifferences(search, preferredUsername) : '';

        if (!preferredUsername) return lastNameMatch;

        const lastNameDiffCount = (lastNameMatch.match(/<span class="ip-highlight">/g) || []).length;
        const preferredUsernameDiffCount = (preferredUsernameMatch.match(/<span class="ip-highlight">/g) || []).length;

        if (lastNameDiffCount <= preferredUsernameDiffCount) {
            return `${lastNameMatch} <span class="ip-preferred-name">(${preferredUsername})</span>`;
        } else {
            return `${lastName} <span class="ip-preferred-name">(${preferredUsernameMatch})</span>`;
        }
    }
}