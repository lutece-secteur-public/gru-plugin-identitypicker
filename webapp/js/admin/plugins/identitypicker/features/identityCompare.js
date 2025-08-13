import { formatDate, getAttributeInfo, getDisplayValue, normalizeString, toTitleCase, getPercentageClass } from '../utils/utils';

export default class IdentityCompare {
    /**
     * Creates an instance of IdentityCompare.
     * @param {Object} identityPicker - The identity picker instance
     */
    constructor(identityPicker) {
        this.identityPicker = identityPicker;
        this.identities = [];
    }

    /**
     * Initializes the compare view with sorted identities.
     * @param {Array<Object>} identities - Array of identity objects to compare
     * @returns {void}
     */
    initCompareView(identities) {
        this.identities = identities.sort((a, b) => {
            const qualityDiff = b.quality.scoring - a.quality.scoring;
            if (qualityDiff !== 0) return qualityDiff;
            return new Date(b.last_update_date) - new Date(a.last_update_date);
        });
        this.renderCompareTable();
    }

    /**
     * Renders the comparison table with all identities.
     * @returns {void}
     */
    renderCompareTable() {
        const width = window.innerWidth;
        const idealWidth = 200 + (300 * this.identities.length);
        if (idealWidth > width) {
            this.identityPicker.modalContent.style.maxWidth = `${width - 50}px`;
        } else {
            this.identityPicker.modalContent.style.maxWidth = `${idealWidth}px`;
        }
        const tableHeaders = this.identities.map(identity => `
            <th>
                <a href="#" class="ip-select-link" data-customer-id="${identity.customer_id}">
                    ${identity.customer_id}
                </a>
            </th>
        `).join('');
        let tableRows = '';
        const referenceIdentity = this.identities[0];
        const certificationsRow = this.createCertificationsRow(referenceIdentity);
        const monParisRow = this.createMonParisRow();
        let identityInfoRows = this.createIdentityInfoRows();
        let contactInfoRows = this.createContactInfoRows();
        let additionalInfoRows = this.createAdditionalInfoRows();
        tableRows = `<tr class="ip-group-separator">
                <td class="ip-table-separator ip-group-label">Informations d'identité</td>
                ${Array(this.identities.length).fill(`<td class="ip-table-separator"></td>`).join('')}
            </tr>` +
            certificationsRow +
            monParisRow +
            identityInfoRows +
            `<tr class="ip-group-separator">
                <td class="ip-table-separator ip-group-label">Informations de contact</td>
                ${Array(this.identities.length).fill(`<td class="ip-table-separator"></td>`).join('')}
            </tr>` +
            contactInfoRows +
            `<tr class="ip-group-separator">
                <td class="ip-table-separator ip-group-label">Informations complémentaires</td>
                ${Array(this.identities.length).fill(`<td class="ip-table-separator"></td>`).join('')}
            </tr>` +
            additionalInfoRows;
        const tableHtml = `
            <div class="ip-scrollable-content ip-compare-table-container">
                <table class="ip-compare-table">
                    <thead>
                        <tr>
                            <th></th>
                            ${tableHeaders}
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </div>
        `;
        this.identityPicker.compareContainer.innerHTML = tableHtml;
        this.identityPicker.compareContainer.scrollTop = 0;
        this.identityPicker.adjustModalHeight();
        const selectLinks = this.identityPicker.compareContainer.querySelectorAll('.ip-select-link');
        selectLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const customerId = link.dataset.customerId;
                this.identityPicker.showDetailsView(customerId, "compare");
            });
        });
    }

    /**
     * Creates the certification row for pivot attributes.
     * @param {Object} referenceIdentity - The reference identity for comparison
     * @returns {string} HTML string for certification row
     */
    createCertificationsRow(referenceIdentity) {
        const pivotAttributes = this.identityPicker.rules.referential.attributeKeyList.attributeKeys
            .filter(attr => attr.pivot)
            .map(attr => attr.keyName);
        const certificationTexts = this.identities.map(identity => {
            let allCertified = true;
            let minCertLevel = 600;
            for (const pivotAttr of pivotAttributes) {
                const attr = identity.attributes.find(a => a.key === pivotAttr);
                if (!attr) {
                    allCertified = false;
                    break;
                }
                const certCode = attr.certProcess;
                const certDef = this.identityPicker.rules.contract.attributeDefinitions
                    .find(def => def.keyName === pivotAttr)?.attributeCertifications
                    .find(cert => cert.code === certCode);
                if (!certDef || parseInt(certDef.level) < 400) {
                    allCertified = false;
                    break;
                }
                minCertLevel = Math.min(minCertLevel, parseInt(certDef.level));
            }
            if (!allCertified) return "";
            if (minCertLevel >= 600) return "FranceConnect";
            if (minCertLevel >= 500) return "PJ officielle guichet";
            if (minCertLevel >= 400) return "PJ officielle scannée";
            return "";
        });
        if (certificationTexts.every(text => text === "")) {
            return "";
        }
        const referenceText = certificationTexts[0];
        const cells = certificationTexts.map((text, index) => {
            if (index > 0 && text !== referenceText) {
                return `<td><span class="ip-approximate">${text}</span></td>`;
            }
            return `<td>${text}</td>`;
        }).join('');
        return `<tr>
            <td>${this.identityPicker.rules.language.certificationLevel || "Niveau de certification"}</td>
            ${cells}
        </tr>`;
    }

    /**
     * Creates the MonParis account status row.
     * @returns {string} HTML string for MonParis account row
     */
    createMonParisRow() {
        const cells = this.identities.map(identity => {
            const isActive = identity.mon_paris_active;
            const text = isActive ? this.identityPicker.rules.language.active : (identity.expiration && identity.expiration.delete_date ? `${this.identityPicker.rules.language.inactive} (Supprimé)` : this.identityPicker.rules.language.inactive);
            const className = isActive ? 'ip-active' : 'ip-inactive';
            return `<td class="${className}">${text}</td>`;
        }).join('');
        return `<tr>
            <td>${this.identityPicker.rules.language.monParisAccount}</td>
            ${cells}
        </tr>`;
    }

    /**
     * Creates rows for identity information attributes.
     * @returns {string} HTML string for identity information rows
     */
    createIdentityInfoRows() {
        const identityAttributes = [
            { key: 'gender', label: this.identityPicker.rules.language.gender || "Sexe", formatter: this.formatGender.bind(this) },
            { key: 'family_name', label: this.identityPicker.rules.language.familyName || "Nom de naissance", formatter: value => value.toUpperCase() },
            { key: 'preferred_username', label: this.identityPicker.rules.language.preferredUsername || "Nom d'usage", formatter: value => `<i>${value.toUpperCase()}</i>` },
            { key: 'first_name', label: this.identityPicker.rules.language.firstName || "Prénoms", formatter: toTitleCase },
            { key: 'birthdate', label: this.identityPicker.rules.language.birthdate || "Date de naissance" },
            { key: 'birthcountry', label: this.identityPicker.rules.language.birthcountry || "Pays de naissance" },
            { key: 'birthcountry_code', label: this.identityPicker.rules.language.birthcountryCode || "Code INSEE pays" },
            { key: 'birthplace', label: this.identityPicker.rules.language.birthplace || "Commune de naissance" },
            { key: 'birthplace_code', label: this.identityPicker.rules.language.birthplaceCode || "Code INSEE commune" }
        ];
        return this.createAttributeRows(identityAttributes);
    }

    /**
     * Creates rows for contact information attributes.
     * @returns {string} HTML string for contact information rows
     */
    createContactInfoRows() {
        const contactAttributes = [
            { key: 'email', label: this.identityPicker.rules.language.email || "Email de contact" },
            { key: 'login', label: this.identityPicker.rules.language.login || "Login" },
            { key: 'mobile_phone', label: this.identityPicker.rules.language.mobilePhone || "Téléphone portable" },
            { key: 'fixed_phone', label: this.identityPicker.rules.language.fixedPhone || "Téléphone fixe" },
            { key: 'address', label: this.identityPicker.rules.language.address || "Adresse" },
            { key: 'address_detail', label: this.identityPicker.rules.language.addressDetail || "Complément d'adresse" },
            { key: 'address_postal_code', label: this.identityPicker.rules.language.postalCode || "Code postal" },
            { key: 'address_city', label: this.identityPicker.rules.language.city || "Ville" }
        ];
        return this.createAttributeRows(contactAttributes);
    }

    /**
     * Creates rows for additional information (dates, scores, quality metrics).
     * @returns {string} HTML string for additional information rows
     */
    createAdditionalInfoRows() {
        let rows = '';
        rows += this.createRow(
            this.identityPicker.rules.language.creationDate || "Date de Création",
            this.identities.map(identity => formatDate(identity.creation_date))
        );
        rows += this.createRow(
            this.identityPicker.rules.language.lastUpdateDate || "Date de Modification",
            this.identities.map(identity => formatDate(identity.last_update_date))
        );
        rows += this.createRow(
            this.identityPicker.rules.language.qualityScore || "Score",
            this.identities.map(identity => {
                const scoringValue = (identity.quality.scoring * 100).toFixed(2);
                const className = getPercentageClass(scoringValue);
                return { value: `${scoringValue}%`, className };
            })
        );
        rows += this.createRow(
            this.identityPicker.rules.language.qualityLabel || "Qualité",
            this.identities.map(identity => {
                const qualityValue = (identity.quality.quality * 100).toFixed(2);
                const className = getPercentageClass(qualityValue);
                return { value: `${qualityValue}%`, className };
            })
        );
        rows += this.createRow(
            this.identityPicker.rules.language.coverageLabel || "Couverture",
            this.identities.map(identity => {
                const coverageValue = (identity.quality.coverage * 100).toFixed(2);
                const className = getPercentageClass(coverageValue);
                const displayText = coverageValue >= 100 ? (this.identityPicker.rules.language.completeInformation || "Informations Complètes") : (this.identityPicker.rules.language.incompleteInformation || "Informations à compléter");
                return { value: displayText, className };
            })
        );
        return rows;
    }

    /**
     * Creates attribute rows with difference highlighting.
     * @param {Array<Object>} attributeDefinitions - Array of attribute definitions
     * @returns {string} HTML string for attribute rows
     */
    createAttributeRows(attributeDefinitions) {
        let rows = '';
        const referenceIdentity = this.identities[0];
        attributeDefinitions.forEach(attrDef => {
            const referenceValue = this.getAttrValue(referenceIdentity, attrDef.key);
            const referenceFormatted = attrDef.formatter ? attrDef.formatter(referenceValue || '') : referenceValue;
            const cells = this.identities.map((identity, index) => {
                let value = this.getAttrValue(identity, attrDef.key);
                let formattedValue = attrDef.formatter ? attrDef.formatter(value || '') : value;
                const isDifferent = index > 0 && formattedValue !== referenceFormatted;
                if (isDifferent) {
                    return `<td><span class="ip-approximate">${formattedValue || ''}</span></td>`;
                }
                return `<td>${formattedValue || ''}</td>`;
            }).join('');
            rows += `<tr>
                <td>${attrDef.label}</td>
                ${cells}
            </tr>`;
        });
        return rows;
    }

    /**
     * Creates a generic table row.
     * @param {string} label - The row label
     * @param {Array|string} values - Array of values or single value for all cells
     * @returns {string} HTML string for the row
     */
    createRow(label, values) {
        const cells = Array.isArray(values) ? values.map((val, index) => {
            if (typeof val === 'object') {
                return `<td class="${val.className || ''}">${val.value || ''}</td>`;
            }
            return `<td>${val || ''}</td>`;
        }).join('') : Array(this.identities.length).fill(`<td>${values || ''}</td>`).join('');
        return `<tr>
            <td>${label}</td>
            ${cells}
        </tr>`;
    }

    /**
     * Formats gender value for display.
     * @param {string} value - The gender code value
     * @returns {string} Formatted gender display value
     */
    formatGender(value) {
        if (value === '1') return 'F';
        if (value === '2') return 'H';
        return 'ND';
    }


    /**
     * Gets an attribute value from an identity.
     * @param {Object} identity - The identity object
     * @param {string} key - The attribute key
     * @returns {string} The attribute value or empty string
     */
    getAttrValue(identity, key) {
        const attr = identity.attributes.find(a => a.key === key);
        return attr ? getDisplayValue(key, attr.value, this.identityPicker.rules.referential) : '';
    }



}