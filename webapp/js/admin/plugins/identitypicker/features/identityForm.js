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
  if (!attr) return '';
  
  const isWritable = attr.attributeRight && attr.attributeRight.writable;
  const isEditable = this.isFieldEditable(attrKey, isWritable);
  
  if (!isEditable && this.identity) {
    const identityAttr = this.identity.attributes.find(a => a.key === attrKey);
    const value = identityAttr ? identityAttr.value : '';
    if (!value) return '';
    
    const displayValue = this.getDisplayValue(attrKey, value);
    return `
      <div class="ip-form-row ip-readonly-field">
        <div class="ip-form-input">
          <label for="${attr.keyName}">${attr.name}</label>
          <div class="ip-readonly-value">${displayValue}</div>
        </div>
      </div>`;
  }
  
  if (!isWritable) return '';

  const identityAttr = this.identity ? this.identity.attributes.find(a => a.key === attrKey) : null;
  const value = identityAttr ? identityAttr.value : '';
  
  const currentCertLevel = identityAttr?.certProcess ? this.getCertificationLevel(attrKey, identityAttr.certProcess) : 0;
    
  const certOptions = attr.attributeCertifications
    .sort((a, b) => parseInt(a.level) - parseInt(b.level))
    .filter(cert => {
      if (!identityAttr?.certProcess) return true;
      
      const certLevel = parseInt(cert.level);
      const shouldInclude = certLevel >= currentCertLevel;
            
      return shouldInclude;
    })
    .map(cert => `<option value="${cert.code}" ${identityAttr?.certProcess === cert.code ? 'selected' : ''}>${cert.label} (${this.identityPicker.rules.language.qualityLabel} ${cert.level})</option>`)
    .join('');
  
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
        <div class="ip-field-error" id="${attr.keyName}-error" style="display: none;"></div>
      </div>
      <div class="ip-form-select">
        <label for="${attr.keyName}-certification">${this.identityPicker.rules.language.selectCertification} <span class="ip-required" id="${attr.keyName}-cert-required" style="${!value ? 'display: none;' : ''}">${this.identityPicker.rules.language.mandatory}</span></label>
        <select id="${attr.keyName}-certification" name="${attr.keyName}-certification" class="ip-select" ${value ? 'required' : ''}>
          <option value="" ${!identityAttr?.certProcess ? 'selected' : ''} disabled>${this.identityPicker.rules.language.selectCertification}</option>
          ${certOptions}
        </select>
        <div class="ip-field-error" id="${attr.keyName}-certification-error" style="display: none;"></div>
      </div>
    </div>`;
}


getCertificationLevel(attributeKey, certificationProcess) {
  const process = this.identityPicker.rules.referential.processList.processus.find(p => p.code === certificationProcess);
  if (process) {
    const attributeCertification = process.attributeCertificationLevels.find(acl => acl.attributeKey === attributeKey);
    if (attributeCertification && attributeCertification.level) {
      return parseInt(attributeCertification.level.level || 0);
    }
  }
  return 0;
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
    
    const attributeInputs = form.querySelectorAll('input[type="text"], input[type="email"], input[type="date"], select:not([id$="-certification"])');
    attributeInputs.forEach(input => {
        if (input.value) {
        this.validateAttributePair(input);
        }
        
        input.addEventListener('input', (event) => {
        this.validateAttributePair(event.target);
        });
        
        input.addEventListener('change', (event) => {
        this.validateAttributePair(event.target);
        });
        
        input.addEventListener('blur', (event) => {
        this.validateAttributePair(event.target);
        });
    });
    
    const certSelects = form.querySelectorAll('select[id$="-certification"]');
    certSelects.forEach(select => {
        const inputId = select.id.replace('-certification', '');
        const input = form.querySelector(`#${inputId}`);
        if (input && input.value) {
        this.validateCertificationLevel(select);
        }
        
        select.addEventListener('change', (event) => {
        this.validateCertificationLevel(event.target);
        });
    });
    
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        
        let isValid = true;
        
        attributeInputs.forEach(input => {
        if (!this.validateAttributePair(input)) {
            isValid = false;
            input.focus();
        }
        });
        
        certSelects.forEach(select => {
        if (!this.validateCertificationLevel(select)) {
            isValid = false;
            select.focus();
        }
        });
        
        if (isValid) {
        const pivotAttributes = this.identityPicker.rules.referential.attributeKeyList.attributeKeys
            .filter(attr => attr.pivot)
            .map(attr => attr.keyName);
        
        if (this.validatePivotCertificationConsistency(pivotAttributes, form)) {
            this.submitForm(event.target, mode);
        } else {
            isValid = false;
        }
        }
        
        if (!isValid) {
        this.identityPicker.showMessage(
            this.identityPicker.rules.language.formValidationError || 
            'Veuillez corriger les erreurs dans le formulaire avant de soumettre', 
            'error'
        );
        }
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

    validateAttributePair(inputField) {
    const attrKey = inputField.id;
    const certSelect = this.identityPicker.identityFormContainer.querySelector(`#${attrKey}-certification`);
    const certRequired = this.identityPicker.identityFormContainer.querySelector(`#${attrKey}-cert-required`);
    const certError = this.identityPicker.identityFormContainer.querySelector(`#${attrKey}-certification-error`);
    
    if (!certSelect) return true;
    
    const isEmpty = !inputField.value || inputField.value.trim() === '';
    
    if (isEmpty) {
        certSelect.required = false;
        if (certRequired) certRequired.style.display = 'none';
        if (certError) {
        certError.style.display = 'none';
        certError.textContent = '';
        }
        return true;
    } else {
        certSelect.required = true;
        if (certRequired) certRequired.style.display = 'inline';
        
        if (!certSelect.value) {
        if (certError) {
            certError.textContent = this.identityPicker.rules.language.certificationRequired || 'La certification est obligatoire';
            certError.style.display = 'block';
        }
        certSelect.classList.add('ip-error-input');
        return false;
        } else {
        if (certError) {
            certError.style.display = 'none';
            certError.textContent = '';
        }
        certSelect.classList.remove('ip-error-input');
        return true;
        }
    }
    }


    validateCertificationLevel(certSelect) {
    const attrKey = certSelect.id.replace('-certification', '');
    const inputField = this.identityPicker.identityFormContainer.querySelector(`#${attrKey}`);
    const certError = this.identityPicker.identityFormContainer.querySelector(`#${attrKey}-certification-error`);
    
    if (!inputField) return true;
    
    const isEmpty = !inputField.value || inputField.value.trim() === '';
    
    if (!isEmpty && !certSelect.value) {
        if (certError) {
        certError.textContent = this.identityPicker.rules.language.certificationRequired || 'La certification est obligatoire';
        certError.style.display = 'block';
        }
        certSelect.classList.add('ip-error-input');
        return false;
    } else {
        if (certError) {
        certError.style.display = 'none';
        certError.textContent = '';
        }
        certSelect.classList.remove('ip-error-input');
        return true;
    }
    }

validatePivotCertificationConsistency(pivotAttributes, form) {
  let highestLevel = 0;
  const pivotCertLevels = {};
  
  for (const attrKey of pivotAttributes) {
    const inputField = form.querySelector(`#${attrKey}`);
    const certSelect = form.querySelector(`#${attrKey}-certification`);
    
    if (inputField && certSelect && inputField.value && certSelect.value) {
      const certLevel = this.getCertificationLevel(attrKey, certSelect.value);
      pivotCertLevels[attrKey] = certLevel;
      
      if (certLevel > highestLevel) {
        highestLevel = certLevel;
      }
    }
  }
  
  if (highestLevel >= 400) {
    const filledPivotAttrs = Object.keys(pivotCertLevels);
    const hasInconsistentLevels = filledPivotAttrs.some(key => pivotCertLevels[key] !== highestLevel);
    
    if (hasInconsistentLevels) {
      this.identityPicker.showMessage(
        this.identityPicker.rules.language.inconsistentCertification || 
        'Les niveaux de certification des attributs pivots doivent être cohérents (tous du même niveau si ≥ 400)',
        'error'
      );
      
      for (const attrKey of filledPivotAttrs) {
        if (pivotCertLevels[attrKey] !== highestLevel) {
          const certSelect = form.querySelector(`#${attrKey}-certification`);
          const certError = form.querySelector(`#${attrKey}-certification-error`);
          
          if (certSelect) {
            certSelect.classList.add('ip-error-input');
          }
          
          if (certError) {
            certError.textContent = this.identityPicker.rules.language.inconsistentCertLevelForAttr || 
              'Niveau de certification incohérent, doit être le même que les autres attributs pivots';
            certError.style.display = 'block';
          }
        }
      }
      
      return false;
    }
  }
  
  return true;
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
            await this.identityPicker.showDetailsView(responseData.customer_id, 'results', 'success', successMessage);
    
        } catch (error) {
            console.error(this.identityPicker.rules.language.fetchError, error);
            
            if (error.status && (error.status.attributes_status || error.status.message)) {
                this.handleSaveError(error);
            } else if (error instanceof Response) {
                const errorMessage = `${this.identityPicker.rules.language.httpError} ${error.status}`;
                this.identityPicker.showMessage('errorMessage', 'error', errorMessage);
            } else {
                const errorMessage = error.message || this.identityPicker.rules.language.unknownError;
                this.identityPicker.showMessage('errorMessage', 'error', errorMessage);
            }
    
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
    
        if (birthdateInput && birthcountrySelect && birthplaceInput) {
            const isBirthdateEmpty = birthdateInput.value.trim() === '';
            const isBirthcountryCodeEmpty = !birthcountryCodeInput || birthcountryCodeInput.value.trim() === '';
    
            birthcountrySelect.disabled = isBirthdateEmpty;
            birthcountryMessage.style.display = isBirthdateEmpty ? 'block' : 'none';
    
            if (this.birthcountryChoices) {

                isBirthdateEmpty ? this.birthcountryChoices.disable() : this.birthcountryChoices.enable();

            }
    
            const shouldEnableBirthplace = !isBirthdateEmpty && !isBirthcountryCodeEmpty;
    
            birthplaceInput.disabled = !shouldEnableBirthplace;
            birthplaceMessage.style.display = shouldEnableBirthplace ? 'none' : 'block';
    
    
            if (shouldEnableBirthplace) {
                if (birthcountryCodeInput.value === '99100') {
                    this.setupBirthplaceSelect(birthplaceInput, birthplaceCodeInput);
                } else {
                    this.setupBirthplaceInput(birthplaceInput, birthplaceCodeInput);
                }
            }
    
            if (!shouldEnableBirthplace && this.birthplaceChoices) {
                this.birthplaceChoices.disable();
            }
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

    isFieldEditable(attrKey, isWritable) {
        // In creation mode, all writable fields are editable
        if (!this.identity) {
            return isWritable;
        }
        
        // In modification mode, check if field can be modified
        const identityAttr = this.identity.attributes.find(a => a.key === attrKey);
        
        // If field has no value, it can be edited if writable
        if (!identityAttr || !identityAttr.value) {
            return isWritable;
        }
        
        // Check certification level - fields with high certification might not be editable
        if (identityAttr.certProcess) {
            const certLevel = this.getCertificationLevel(attrKey, identityAttr.certProcess);
            // Fields with certification level >= 400 are not editable
            if (certLevel >= 400) {
                return false;
            }
        }
        
        // Otherwise, field is editable if writable
        return isWritable;
    }

    handleSaveError(error) {
        this.clearFieldErrors();
        
        if (error.status && error.status.attributes_status) {
            this.displayFieldErrors(error.status.attributes_status);
            
            const generalMessage = error.status.message || this.identityPicker.rules.language.validationError || 'Erreur de validation';
            this.identityPicker.showMessage('errorMessage', 'error', generalMessage);
        } else if (error.status && error.status.message) {
            this.identityPicker.showMessage('errorMessage', 'error', error.status.message);
            console.error('Erreur serveur:', error.status);
        } else {
            this.identityPicker.showMessage('errorMessage', 'error', this.identityPicker.rules.language.unknownError || 'Une erreur inconnue est survenue');
            console.error('Erreur non catégorisée:', error);
        }
    }

    displayFieldErrors(attributesStatus) {
        this.clearFieldErrors();
        
        let firstErrorField = null;

        attributesStatus.forEach(attribute => {
            const inputField = this.identityPicker.identityFormContainer.querySelector(`[name="${attribute.key}"]`);
            if (inputField) {
                inputField.classList.add('ip-error-input');
                
                if (!firstErrorField) {
                    firstErrorField = inputField;
                }
                
                const existingErrorDiv = this.identityPicker.identityFormContainer.querySelector(`#${attribute.key}-error`);
                if (existingErrorDiv) {
                    existingErrorDiv.textContent = attribute.message;
                    existingErrorDiv.style.display = 'block';
                } else {
                    const errorMessage = document.createElement('div');
                    errorMessage.className = 'ip-field-error';
                    errorMessage.textContent = attribute.message;
                    inputField.parentNode.insertBefore(errorMessage, inputField.nextSibling);
                }
            }
        });
        
        if (firstErrorField) {
            setTimeout(() => {
                firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
                firstErrorField.focus();
            }, 100);
        }
    }

    clearFieldErrors() {
        const errorMessages = this.identityPicker.identityFormContainer.querySelectorAll('.ip-field-error');
        errorMessages.forEach(msg => {
            msg.textContent = '';
            msg.style.display = 'none';
        });
        const errorInputs = this.identityPicker.identityFormContainer.querySelectorAll('.ip-error-input');
        errorInputs.forEach(input => input.classList.remove('ip-error-input'));
    }
}