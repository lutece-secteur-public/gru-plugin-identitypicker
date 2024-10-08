import Choices from 'choices.js';
import { debounce, getAttributeValue } from '../utils/utils';

export default class IdentityForm {
    constructor(identityPicker) {
        this.identityPicker = identityPicker;
        this.uniqueId = identityPicker.uniqueId;
        this.birthcountryChoices = null;
        this.birthplaceChoices = null;
        this.identity = null;
    }

    async showCreateIdentityForm() {
        this.identityPicker.showLoading(this.identityPicker.rules.language.loading);
        this.identity = null;
        await this.displayForm('create');
        this.identityPicker.hideLoading();
    }

    async showModifyIdentityForm(customerId) {
        this.identityPicker.showLoading(this.identityPicker.rules.language.loading);
        const identityUrl = `${this.identityPicker.config.endpoints.identity}/${customerId}`;
        try {
            const identityResponse = await fetch(identityUrl);
            if (!identityResponse.ok) {
                throw identityResponse;
            }
            this.identity = await identityResponse.json();
            this.displayForm('modify');
        } catch (error) {
            console.error(this.identityPicker.rules.language.fetchError, error);
            let errorMessage;
            if (error instanceof Response) {
                if (error.status === 403) {
                    errorMessage = `${this.identityPicker.rules.language.httpError} 403`;
                } else {
                    errorMessage = `${this.identityPicker.rules.language.httpError} ${error.status}`;
                }
            } else {
                errorMessage = error.message;
            }
            const messageType = errorMessage.includes('403') ? 'noPermissions' : 'errorMessage';
            this.identityPicker.showMessage(messageType, 'error', errorMessage);
        } finally {
            this.identityPicker.hideLoading();
        }
    }

    async displayForm(mode) {
        const formId = `ip-${mode}-form-${this.uniqueId}`;
        let formHtml = `<form id="${formId}">`;

        for (const [groupKey, group] of Object.entries(this.identityPicker.config.attributeGroups)) {
            formHtml += `<fieldset class="ip-fieldset">
                     <legend>${this.identityPicker.rules.language[`${groupKey}Group`]}</legend>`;
            group.attributes.forEach(attrKey => {
                formHtml += this.generateAttributeField(attrKey);
            });
            formHtml += `</fieldset>`;
        }

        formHtml += `<div class="ip-container-buttons">
        <button class="ip-button-back ip-button-light" type="button">${this.identityPicker.rules.language.backButton}</button>
        <button type="submit">${mode === 'create' ? this.identityPicker.rules.language.createButton : this.identityPicker.rules.language.modifyButton}</button>
        </div></form>`;

        this.identityPicker.identityFormContainer.innerHTML = formHtml;
        this.identityPicker.identityFormContainer.querySelector('.ip-button-back').addEventListener('click', () => {
            if (mode === 'create') {
                this.identityPicker.showResultsView();
            } else {
                this.identityPicker.showDetailsView(this.identity.customer_id, 'results');
            }
        });

        this.initializeFormBehavior(formId, mode);
    }

    generateAttributeField(attrKey) {
        if (attrKey === "birthcountry_code" || attrKey === "birthplace_code") {
            const value = this.identity ? getAttributeValue(this.identity, attrKey) : '';
            return `<input type="hidden" id="${attrKey}" name="${attrKey}" value="${value}">`;
        }

        const attr = this.identityPicker.rules.contract.attributeDefinitions.find(a => a.keyName === attrKey);
        if (!attr || !attr.attributeRight.writable) return '';

        const identityAttr = this.identity ? this.identity.attributes.find(a => a.key === attrKey) : null;
        const value = identityAttr ? identityAttr.value : '';

        return `
    ${attr.keyName === 'birthcountry' ? `<div class="ip-info-message info" id="birthcountry-message" style="display:none">
        <p class="ip-info-message-main">▲ Veuillez fournir la date de naissance pour pouvoir saisir le pays de naissance</p>
    </div>` : ''}

       ${attr.keyName === 'birthplace' ? `<div class="ip-info-message info" id="birthplace-message" style="display:none">
        <p class="ip-info-message-main">▲ Veuillez fournir le pays de naissance pour pouvoir saisir la commune de naissance</p>
    </div>` : ''}

      <div class="ip-form-row">
        <div class="ip-form-input">
          <label for="${attr.keyName}">${attr.name} ${attr.attributeRight.mandatory ? `<span class="ip-required">${this.identityPicker.rules.language.mandatory}</span>` : ''}</label>
          ${this.getInputFieldHtml(attr, value)}
        </div>
        <div class="ip-form-select">
          <label for="${attr.keyName}-certification">${this.identityPicker.rules.language.selectCertification} ${attr.attributeRight.mandatory ? `<span class="ip-required">${this.identityPicker.rules.language.mandatory}</span>` : ''}</label>
          <select id="${attr.keyName}-certification" name="${attr.keyName}-certification" class="ip-select" ${attr.attributeRight.mandatory ? 'required' : ''}>
            <option value="" ${!identityAttr?.certProcess ? 'selected' : ''} disabled>${this.identityPicker.rules.language.selectCertification}</option>
            ${attr.attributeCertifications
                .sort((a, b) => parseInt(a.level) - parseInt(b.level))
                .map(cert => `<option value="${cert.code}" ${identityAttr?.certProcess === cert.code ? 'selected' : ''}>${cert.label} (${this.identityPicker.rules.language.qualityLabel} ${cert.level})</option>`)
                .join('')}
          </select>
        </div>
      </div>`;
    }

    getInputFieldHtml(attr, value) {
        if (attr.keyName === 'birthcountry') {
            return `
        <select id="birthcountry" name="birthcountry" class="ip-birthcountry-select" ${attr.attributeRight.mandatory ? 'required' : ''}>
          ${value ? `<option value="${value}" selected>${value}</option>` : ''}
        </select>`;
        } else if (attr.keyName === 'birthdate') {
            let formattedDate = '';
            if (value) {
                const parts = value.split('/');
                if (parts.length === 3) {
                    formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
                }
            }
            return `<input type="date" id="${attr.keyName}" name="${attr.keyName}" value="${formattedDate}" ${attr.attributeRight.mandatory ? 'required' : ''}>`;
        } else {
            const attributeKey = this.identityPicker.rules.referential.attributeKeyList.attributeKeys.find(a => a.keyName === attr.keyName);
            if (attributeKey && attributeKey.values && attributeKey.values.length > 0) {
                return `
          <select id="${attr.keyName}" class="ip-select" name="${attr.keyName}" ${attr.attributeRight.mandatory ? 'required' : ''}>
            <option value="" ${!value ? 'selected' : ''} disabled>${this.identityPicker.rules.language.selectValue}</option>
            ${attributeKey.values.map(v => `
              <option value="${v.value}" ${v.value === value ? 'selected' : ''}>${v.label}</option>
            `).join('')}
          </select>`;
            } else {
                return `<input type="text" id="${attr.keyName}" name="${attr.keyName}" value="${value}" ${attr.attributeRight.mandatory ? 'required' : ''}>`;
            }
        }
    }

    initializeFormBehavior(formId, mode) {
        this.initializeChoices();
        this.initBirthcountrySelect();
        this.applyFormRules();

        const form = this.identityPicker.identityFormContainer.querySelector(`#${formId}`);
        form.addEventListener('submit', (event) => {
            event.preventDefault();
            this.submitForm(event.target, mode);
        });

        const birthdateInput = this.identityPicker.identityFormContainer.querySelector('#birthdate');
        const birthcountrySelect = this.identityPicker.identityFormContainer.querySelector('#birthcountry');

        if (birthdateInput) {
            birthdateInput.addEventListener('change', () => this.applyFormRules());
        }
        if (birthcountrySelect) {
            birthcountrySelect.addEventListener('change', () => this.applyFormRules());
        }
    }

    async submitForm(form, mode) {
        const formData = new FormData(form);
        const jsonData = {};
    
        for (let [key, value] of formData.entries()) {
            const [attrKey, certType] = key.split('-');
            if (!jsonData[attrKey]) {
                jsonData[attrKey] = {};
            }
            if (certType === 'certification') {
                jsonData[attrKey].certification = value;
            } else {
                jsonData[attrKey].value = value;
            }
        }
    
        const url = mode === 'create' 
            ? this.identityPicker.config.endpoints.identity 
            : `${this.identityPicker.config.endpoints.identity}/${this.identity.customer_id}`;
        
        this.identityPicker.showLoading(this.identityPicker.rules.language.loading);
    
        try {
            const response = await fetch(url, {
                method: mode === 'create' ? 'POST' : 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(jsonData),
            });
    
            const responseData = await response.json();
    
            if (!response.ok) {
                throw responseData;
            }
    
            const successMessage = mode === 'create' ? 'successCreate' : 'successModify';
            await this.identityPicker.identityView.showDetailsView(responseData.customer_id, 'results', 'success', successMessage);
    
        } catch (error) {
            console.error(this.identityPicker.rules.language.fetchError, error);
            
            let errorMessage;
            if (error.status && error.status.message) {
                errorMessage = error.status.message;
                this.handleSaveError(error);
            } else if (error instanceof Response) {
                errorMessage = `${this.identityPicker.rules.language.httpError} ${error.status}`;
            } else {
                errorMessage = error.message || this.identityPicker.rules.language.unknownError;
            }
    
            const messageType = errorMessage.includes('403') ? 'noPermissions' : 'errorMessage';
            this.identityPicker.showMessage(messageType, 'error', errorMessage);
            this.clearFieldErrors();
    
        } finally {
            this.identityPicker.hideLoading();
        }
    }

    initializeChoices() {
        document.querySelectorAll('.ip-select').forEach(select => {
            new Choices(select, {
                searchEnabled: false,
                itemSelectText: '',
                shouldSort: false,
                placeholder: true,
            });
        });
    }

    initBirthcountrySelect() {
        const birthcountrySelect = document.querySelector('.ip-birthcountry-select');
        if (birthcountrySelect) {
            this.birthcountryChoices = new Choices(birthcountrySelect, {
                searchEnabled: true,
                itemSelectText: '',
                placeholder: true,
                placeholderValue: this.identityPicker.rules.language.selectCountry,
                searchPlaceholderValue: this.identityPicker.rules.language.searchCountry,
                shouldSort: false,
                noResultsText: this.identityPicker.rules.language.noCountryResults,
                noChoicesText: this.identityPicker.rules.language.noCountryAvailable,
                loadingText: this.identityPicker.rules.language.loadingCountries,
            });

            this.birthcountryChoices.passedElement.element.addEventListener(
                'search',
                debounce((event) => {
                    const query = event.detail.value;
                    if (query && query.length >= this.identityPicker.config.choices.minSearchLength) {
                        this.fetchGeoCode('birthcountry', query, this.identityPicker.identityFormContainer.querySelector('#birthdate').value, this.birthcountryChoices);
                    }
                }, this.identityPicker.config.choices.debounceTime)
            );

            this.birthcountryChoices.passedElement.element.addEventListener('choice', event => {
                const birthcountryCodeInput = this.identityPicker.identityFormContainer.querySelector('#birthcountry_code');
                if (birthcountryCodeInput) {
                    birthcountryCodeInput.value = event.detail.value;
                    this.applyFormRules();
                }
            });
        }
    }

    fetchGeoCode(type, search, additionalParam, choicesInstance) {
        const endpoint = `${this.identityPicker.config.endpoints[type === 'birthcountry' ? 'countries' : 'cities']}?search=${encodeURIComponent(search)}&additionalParam=${encodeURIComponent(additionalParam)}`;

        fetch(endpoint, {
            headers: { accept: 'application/json' }
        })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'OK' && data.result) {
                    const choices = data.result.map(item => ({
                        value: item.code,
                        label: item.value,
                    }));
                    choicesInstance.setChoices(choices, 'value', 'label', true);
                } else {
                    choicesInstance.setChoices([], 'value', 'label', true);
                }
            })
            .catch(error => {
                console.error(`${this.identityPicker.rules.language.fetchError} ${type === 'birthcountry' ? this.identityPicker.rules.language.loadingCountries : this.identityPicker.rules.language.loadingCities}`, error);
                choicesInstance.setChoices([], 'value', 'label', true);
            });
    }

    applyFormRules() {
        const birthdateInput = this.identityPicker.identityFormContainer.querySelector('#birthdate');
        const birthcountrySelect = this.identityPicker.identityFormContainer.querySelector('#birthcountry');
        const birthcountryCodeInput = this.identityPicker.identityFormContainer.querySelector('#birthcountry_code');
        const birthplaceInput = this.identityPicker.identityFormContainer.querySelector('#birthplace');
        const birthplaceCodeInput = this.identityPicker.identityFormContainer.querySelector('#birthplace_code');
        const birthplaceMessage = this.identityPicker.identityFormContainer.querySelector('#birthplace-message');
        const birthcountryMessage = this.identityPicker.identityFormContainer.querySelector('#birthcountry-message');
    
        console.log('Form elements:', {
            birthdateInput,
            birthcountrySelect,
            birthcountryCodeInput,
            birthplaceInput,
            birthplaceCodeInput
        });
    
        if (birthdateInput && birthcountrySelect && birthplaceInput) {
            const isBirthdateEmpty = birthdateInput.value.trim() === '';
            const isBirthcountryCodeEmpty = !birthcountryCodeInput || birthcountryCodeInput.value.trim() === '';
    
            console.log('State checks:', {
                isBirthdateEmpty,
                isBirthcountryCodeEmpty,
                birthdateValue: birthdateInput.value,
                birthcountryCodeValue: birthcountryCodeInput?.value
            });
    
            birthcountrySelect.disabled = isBirthdateEmpty;
            birthcountryMessage.style.display = isBirthdateEmpty ? 'block' : 'none';
    
            console.log('Birthcountry state:', {
                selectDisabled: birthcountrySelect.disabled,
                messageDisplay: birthcountryMessage.style.display
            });
    
            if (this.birthcountryChoices) {
                console.log('Birthcountry choices before:', {
                    exists: !!this.birthcountryChoices,
                    isEnabled: !this.birthcountryChoices.disabled
                });
                
                isBirthdateEmpty ? this.birthcountryChoices.disable() : this.birthcountryChoices.enable();
                
                console.log('Birthcountry choices after:', {
                    isEnabled: !this.birthcountryChoices.disabled
                });
            }
    
            const shouldEnableBirthplace = !isBirthdateEmpty && !isBirthcountryCodeEmpty;
            console.log('Birthplace enable check:', { shouldEnableBirthplace });
    
            birthplaceInput.disabled = !shouldEnableBirthplace;
            birthplaceMessage.style.display = shouldEnableBirthplace ? 'none' : 'block';
    
            console.log('Birthplace state:', {
                inputDisabled: birthplaceInput.disabled,
                messageDisplay: birthplaceMessage.style.display
            });
    
            if (shouldEnableBirthplace) {
                if (birthcountryCodeInput.value === '99100') {
                    console.log('Setting up birthplace as select');
                    this.setupBirthplaceSelect(birthplaceInput, birthplaceCodeInput);
                } else {
                    console.log('Setting up birthplace as input');
                    this.setupBirthplaceInput(birthplaceInput, birthplaceCodeInput);
                }
            }
    
            if (!shouldEnableBirthplace && this.birthplaceChoices) {
                console.log('Disabling birthplace choices');
                this.birthplaceChoices.disable();
            }
        } else {
            console.log('Required form elements missing:', {
                hasBirthdateInput: !!birthdateInput,
                hasBirthcountrySelect: !!birthcountrySelect,
                hasBirthplaceInput: !!birthplaceInput
            });
        }
    }

    setupBirthplaceSelect(birthplaceInput, birthplaceCodeInput) {
        const currentValue = birthplaceInput.value;
        const currentCode = birthplaceCodeInput ? birthplaceCodeInput.value : '';

        if (birthplaceInput.tagName.toLowerCase() !== 'select') {
            const selectElement = document.createElement('select');
            selectElement.id = birthplaceInput.id;
            selectElement.name = birthplaceInput.name;
            selectElement.className = birthplaceInput.className;
            if (birthplaceInput.required) {
                selectElement.required = true;
            }
            if (currentValue && currentCode) {
                const option = document.createElement('option');
                option.value = currentCode;
                option.text = currentValue;
                option.selected = true;
                selectElement.appendChild(option);
            }
            birthplaceInput.parentNode.replaceChild(selectElement, birthplaceInput);
            birthplaceInput = selectElement;
        }

        if (!this.birthplaceChoices) {
            this.birthplaceChoices = new Choices(birthplaceInput, {
                searchEnabled: true,
                itemSelectText: '',
                placeholder: true,
                placeholderValue: this.identityPicker.rules.language.selectCity,
                searchPlaceholderValue: this.identityPicker.rules.language.searchCity,
                shouldSort: false,
                noResultsText: this.identityPicker.rules.language.noCityResults,
                noChoicesText: this.identityPicker.rules.language.noCityAvailable,
                loadingText: this.identityPicker.rules.language.loadingCities,
            });

            this.birthplaceChoices.passedElement.element.addEventListener(
                'search',
                debounce((event) => {
                    const query = event.detail.value;
                    if (query && query.length >= this.identityPicker.config.choices.minSearchLength) {
                        this.fetchGeoCode('birthplace', query, this.identityPicker.identityFormContainer.querySelector('#birthdate').value, this.birthplaceChoices);
                    }
                }, this.identityPicker.config.choices.debounceTime)
            );

            this.birthplaceChoices.passedElement.element.addEventListener('choice', event => {
                if (birthplaceCodeInput) {
                    birthplaceCodeInput.value = event.detail.value;
                }
            });

            if (currentValue && currentCode) {
                this.birthplaceChoices.setChoiceByValue(currentCode);
            }
        } else {
            this.birthplaceChoices.enable();
            if (currentValue && currentCode) {
                this.birthplaceChoices.setChoiceByValue(currentCode);
            }
        }
    }


    setupBirthplaceInput(birthplaceInput, birthplaceCodeInput) {
        if (this.birthplaceChoices) {
            this.birthplaceChoices.destroy();
            this.birthplaceChoices = null;
        }

        if (birthplaceInput.tagName.toLowerCase() !== 'input') {
            const inputElement = document.createElement('input');
            inputElement.type = 'text';
            inputElement.id = birthplaceInput.id;
            inputElement.name = birthplaceInput.name;
            inputElement.className = birthplaceInput.className;
            if (birthplaceInput.required) {
                inputElement.required = true;
            }
            birthplaceInput.parentNode.replaceChild(inputElement, birthplaceInput);
        }

        if (birthplaceCodeInput) {
            birthplaceCodeInput.value = '';
        }
    }

    getAttributeInfo(key) {
        const attributeKey = this.identityPicker.rules.referential.attributeKeyList.attributeKeys.find(attr => attr.keyName === key);
        return {
            label: attributeKey ? attributeKey.name : key,
            description: attributeKey ? attributeKey.description : ''
        };
    }

    getCertificationInfo(attributeKey, certificationProcess) {
        const process = this.identityPicker.rules.referential.processList.processus.find(p => p.code === certificationProcess);
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
            description: this.identityPicker.rules.language.certificationUnavailable
        };
    }

    getDisplayValue(key, value) {
        const attributeKey = this.identityPicker.rules.referential.attributeKeyList.attributeKeys.find(attr => attr.keyName === key);
        if (attributeKey && attributeKey.values) {
            const matchingValue = attributeKey.values.find(v => v.value === value);
            return matchingValue ? matchingValue.label : value;
        }
        return value;
    }

    handleSaveError(error) {
        if (error.status && error.status.attributes_status) {
            this.displayFieldErrors(error.status.attributes_status);
        } else {
            this.identityPicker.showMessage(error.status.message || 'An error occurred while saving', 'error');
        }
    }


    displayFieldErrors(attributesStatus) {
        this.clearFieldErrors();

        attributesStatus.forEach(attribute => {
            const inputField = this.identityPicker.identityFormContainer.querySelector(`[name="${attribute.key}"]`);
            if (inputField) {
                const errorMessage = document.createElement('div');
                errorMessage.className = 'ip-field-error';
                errorMessage.textContent = attribute.message;
                inputField.parentNode.insertBefore(errorMessage, inputField.nextSibling);
                inputField.classList.add('ip-error-input');
            }
        });
    }

    clearFieldErrors() {
        const errorMessages = this.identityPicker.identityFormContainer.querySelectorAll('.ip-field-error');
        errorMessages.forEach(msg => msg.remove());
        const errorInputs = this.identityPicker.identityFormContainer.querySelectorAll('.ip-error-input');
        errorInputs.forEach(input => input.classList.remove('ip-error-input'));
    }
}