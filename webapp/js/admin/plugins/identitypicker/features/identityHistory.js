import Fuse from 'fuse.js';
import { getAttributeInfo, getCertificationInfo } from '../utils/utils';

export default class IdentityHistory {
    /**
     * Creates an instance of IdentityHistory.
     * @param {Object} identityPicker - The identity picker instance
     */
    constructor(identityPicker) {
        this.identityPicker = identityPicker;
        this.globalHistory = [];
        this.fuse = null;
    }

    /**
     * Loads and displays the complete history for an identity.
     * @param {string} customerId - The customer ID to load history for
     * @returns {Promise<void>}
     */
    async loadGlobalHistory(customerId) {
        this.identityPicker.showLoading(this.identityPicker.rules.language.loadingHistory);
        try {
            const [identityHistory, tasksData] = await Promise.all([
                this.fetchIdentityHistory(customerId),
                this.fetchIdentityTasks(customerId)
            ]);
            this.globalHistory = this.mergeHistoryData(identityHistory, tasksData);
            this.initFuseSearch();
            this.displayGlobalHistory(this.globalHistory);
        } catch (error) {
            console.error(this.identityPicker.rules.language.fetchError, error);
            this.identityPicker.showMessage('errorLoadingHistory', 'error');
        } finally {
            this.identityPicker.hideLoading();
        }
    }

    /**
     * Fetches identity history data from the API.
     * @param {string} customerId - The customer ID
     * @returns {Promise<Object>} The identity history data
     */
    async fetchIdentityHistory(customerId) {
        const url = `${this.identityPicker.config.endpoints.identity}/${customerId}/${this.identityPicker.config.endpoints.history}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`${this.identityPicker.rules.language.httpError} ${response.status}`);
        }
        return response.json();
    }

    /**
     * Fetches identity tasks data from the API.
     * @param {string} customerId - The customer ID
     * @returns {Promise<Object>} The tasks data
     */
    async fetchIdentityTasks(customerId) {
        const url = `${this.identityPicker.config.endpoints.identity}/${customerId}/${this.identityPicker.config.endpoints.tasks}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`${this.identityPicker.rules.language.httpError} ${response.status}`);
        }
        return response.json();
    }

    /**
     * Merges identity history and tasks data into a unified timeline.
     * @param {Object} identityHistory - The identity history data
     * @param {Array} tasksData - The tasks data
     * @returns {Array} Sorted array of all history events
     */
    mergeHistoryData(identityHistory, tasksData) {
        const allEvents = [];
        const language = this.identityPicker.rules.language;
        identityHistory.identity_changes.forEach(change => {
            const changeTypeText = language.history[change.changeType.toLowerCase()]?.[change.changeStatus.toLowerCase()] || '';
            const authorName = change.author?.author_name || language.unknown;
            const changeMessage = change.changeMessage || '';
            const formattedDate = this.formatDate(parseInt(change.modificationDate));
            allEvents.push({
                date: new Date(parseInt(change.modificationDate)),
                type: 'identity',
                data: change,
                changeTypeText,
                authorName,
                changeMessage,
                searchableText: `${formattedDate} ${changeTypeText} ${authorName} ${changeMessage}`
            });
        });
        identityHistory.attribute_histories.forEach(attrHistory => {
            const attributeInfo = getAttributeInfo(attrHistory.attribute_key, this.identityPicker.rules.referential);
            const attributeLabel = attributeInfo?.label || '';
            attrHistory.attribute_changes.forEach(change => {
                const attributeValue = change.attribute_value || '';
                const attributeChangeType = language.attributeChangeType || '';
                const certificationProcess = change.certification_processus || '';
                const formattedDate = this.formatDate(parseInt(change.modification_date));
                allEvents.push({
                    date: new Date(parseInt(change.modification_date)),
                    type: 'attribute',
                    data: {
                        ...change,
                        attribute_key: attrHistory.attribute_key,
                        certification_processus: certificationProcess
                    },
                    attributeLabel,
                    attributeValue,
                    attributeChangeType,
                    certificationProcess,
                    searchableText: `${formattedDate} ${attributeLabel} ${attributeValue} ${attributeChangeType} ${certificationProcess}`
                });
            });
        });
        tasksData.forEach(task => {
            task.task_history.forEach(change => {
                const taskLanguage = language.tasks;
                const taskTypeText = this.getTaskTypeText(task.task_type, taskLanguage);
                const changeTypeText = this.getTaskChangeTypeText(task.task_type, change.task_change_type, change.task_status, taskLanguage);
                const statusText = this.getTaskStatusText(task.task_type, change.task_status, taskLanguage);
                const authorName = change.request_author?.author_name || language.unknown;
                const metadataText = Object.values(task.metadata || {}).join(' ');
                const formattedDate = this.formatDate(parseInt(change.task_change_date));
                allEvents.push({
                    date: new Date(parseInt(change.task_change_date)),
                    type: 'task',
                    data: { task, change },
                    taskTypeText,
                    changeTypeText,
                    statusText,
                    authorName,
                    metadataText,
                    taskCode: task.task_code,
                    searchableText: `${formattedDate} ${taskTypeText} ${changeTypeText} ${statusText} ${authorName} ${metadataText}`
                });
            });
        });
        allEvents.sort((a, b) => b.date - a.date);
        return allEvents;
    }

    /**
     * Gets the localized task type text.
     * @param {string} taskType - The task type code
     * @param {Object} languageTasks - The language tasks object
     * @returns {string} Localized task type text
     */
    getTaskTypeText(taskType, languageTasks) {
        const key = taskType.toLowerCase();
        return languageTasks[key]?.label || taskType;
    }

    /**
     * Gets the localized task change type text.
     * @param {string} taskType - The task type code
     * @param {string} changeType - The change type code
     * @param {string} status - The status code
     * @param {Object} languageTasks - The language tasks object
     * @returns {string} Localized task change type text
     */
    getTaskChangeTypeText(taskType, changeType, status, languageTasks) {
        const taskKey = taskType.toLowerCase();
        const changeKey = changeType.toLowerCase();
        const statusKey = status.toLowerCase();
        return languageTasks[taskKey]?.[changeKey]?.[statusKey] || `${taskType} ${changeType} ${status}`;
    }

    /**
     * Gets the localized task status text.
     * @param {string} taskType - The task type code
     * @param {string} status - The status code
     * @param {Object} languageTasks - The language tasks object
     * @returns {string} Localized task status text
     */
    getTaskStatusText(taskType, status, languageTasks) {
        const taskKey = taskType.toLowerCase();
        const statusKey = status.toLowerCase();
        return languageTasks[taskKey]?.status?.[statusKey] || status;
    }

    /**
     * Initializes Fuse.js for fuzzy search functionality.
     * @returns {void}
     */
    initFuseSearch() {
        const options = {
            includeScore: true,
            threshold: 0.3,
            useExtendedSearch: true,
            keys: [
                'type',
                'changeTypeText',
                'authorName',
                'changeMessage',
                'attributeLabel',
                'attributeValue',
                'certificationProcess',
                'taskTypeText',
                'statusText',
                'metadataText',
                'taskCode',
                'searchableText'
            ]
        };
        this.fuse = new Fuse(this.globalHistory, options);
    }

    /**
     * Searches history with fuzzy matching.
     * @param {string} query - The search query
     * @returns {Array} Filtered and sorted history events
     */
    searchHistory(query) {
        if (!query) {
            return this.globalHistory;
        }
        const queryWords = query.split(' ').filter(Boolean);
        const searchPattern = {
            $and: queryWords.map(word => ({
                $or: [
                    { 'type': word },
                    { 'changeTypeText': word },
                    { 'authorName': word },
                    { 'changeMessage': word },
                    { 'attributeLabel': word },
                    { 'attributeValue': word },
                    { 'certificationProcess': word },
                    { 'taskTypeText': word },
                    { "taskCode": word },
                    { 'statusText': word },
                    { 'metadataText': word },
                    { 'searchableText': word }
                ]
            }))
        };
        const results = this.fuse.search(searchPattern);
        const sortedResults = results.map(result => result.item)
            .sort((a, b) => b.date - a.date);
        return sortedResults;
    }

    /**
     * Displays the global history in the side container.
     * @param {Array} globalHistory - The history events to display
     * @returns {void}
     */
    displayGlobalHistory(globalHistory) {
        const historyHTML = this.generateGlobalHistoryHTML(globalHistory);
        const searchBarHTML = this.generateSearchBarHTML();
        this.identityPicker.openSideContainer(
            this.identityPicker.rules.language.historyTitle,
            searchBarHTML + `<div class="ip-timeline">${historyHTML}</div>`
        );
        this.attachListener();
    }

    /**
     * Generates HTML for the search bar.
     * @returns {string} HTML string for search bar
     */
    generateSearchBarHTML() {
        return `
            <div class="ip-search-bar">
                <input type="text" class="ip-search-input" placeholder="${this.identityPicker.rules.language.searchHistory}">
            </div>
        `;
    }

    /**
     * Attaches event listeners to search input and copy buttons.
     * @returns {void}
     */
    attachListener() {
        const searchInput = this.identityPicker.sideContainer.querySelector('.ip-search-input');
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value;
            const filteredHistory = this.searchHistory(query);
            const historyHTML = this.generateGlobalHistoryHTML(filteredHistory);
            this.identityPicker.shadowRoot.querySelector('.ip-timeline').innerHTML = historyHTML;
        });
        searchInput.focus();
        this.identityPicker.sideContainer.querySelectorAll('.ip-copy-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const taskCode = e.target.dataset.taskCode;
                this.copyToClipboard(taskCode, e.target);
            });
        });
    }

    /**
     * Generates HTML for the complete history timeline.
     * @param {Array} globalHistory - The history events
     * @returns {string} HTML string for history timeline
     */
    generateGlobalHistoryHTML(globalHistory) {
        let html = '';
        let currentDate = null;
        let currentDateEvents = [];
        globalHistory.forEach(event => {
            if (event.type === 'task') {
                html += this.renderSingleEvent(event);
            } else {
                const eventDate = this.formatDateForGrouping(event.date);
                if (eventDate !== currentDate) {
                    if (currentDate) {
                        html += this.renderDateEvents(currentDate, currentDateEvents);
                    }
                    currentDate = eventDate;
                    currentDateEvents = [];
                }
                currentDateEvents.push(event);
            }
        });
        if (currentDate) {
            html += this.renderDateEvents(currentDate, currentDateEvents);
        }
        return html;
    }

    /**
     * Renders a single timeline event.
     * @param {Object} event - The event to render
     * @returns {string} HTML string for single event
     */
    renderSingleEvent(event) {
        return `
            <div class="ip-timeline-item">
                <div class="ip-timeline-point"></div>
                <div class="ip-timeline-content">
                    <div class="ip-date-and-types">
                        <span class="date">${this.formatDate(event.date)}</span>
                        <span class="ip-event-types">
                            <span class="ip-mini-tag ip-tag-${event.type}">${this.getEventTypeLabel(event.type)}</span>
                        </span>
                    </div>
                    ${this.generateTaskChangeHTML(event)}
                </div>
            </div>
        `;
    }

    /**
     * Renders events grouped by date.
     * @param {string} date - The formatted date string
     * @param {Array} events - Events for this date
     * @returns {string} HTML string for date-grouped events
     */
    renderDateEvents(date, events) {
        const eventTypes = this.getEventTypes(events);
        const groupedEvents = this.groupEventsByType(events);
        const hasAttribute = eventTypes.includes('attribute');
        const typesToDisplay = hasAttribute ? ['attribute'] : eventTypes;
        return `
            <div class="ip-timeline-item">
                <div class="ip-timeline-point"></div>
                <div class="ip-timeline-content">
                    <div class="ip-date-and-types">
                        <span class="date">${date}</span>
                        <span class="ip-event-types">
                            ${typesToDisplay.map(type => `<span class="ip-mini-tag ip-tag-${type}">${this.getEventTypeLabel(type)}</span>`).join('')}
                        </span>
                    </div>
                    ${this.renderGroupedEvents(groupedEvents)}
                </div>
            </div>
        `;
    }

    /**
     * Groups events by their type.
     * @param {Array} events - Events to group
     * @returns {Object} Events grouped by type
     */
    groupEventsByType(events) {
        const grouped = {
            identity: [],
            attribute: [],
            task: []
        };
        events.forEach(event => {
            grouped[event.type].push(event);
        });
        return grouped;
    }

    /**
     * Renders grouped events by type.
     * @param {Object} groupedEvents - Events grouped by type
     * @returns {string} HTML string for grouped events
     */
    renderGroupedEvents(groupedEvents) {
        let html = '';
        if (groupedEvents.identity.length > 0) {
            html += this.generateIdentityChangeHeader(groupedEvents.identity[0]);
        }
        if (groupedEvents.attribute.length > 0) {
            html += this.generateAttributeChangesTable(groupedEvents.attribute);
        }
        groupedEvents.task.forEach(taskEvent => {
            html += this.generateTaskChangeHTML(taskEvent);
        });
        return html;
    }

    /**
     * Gets unique event types from an array of events.
     * @param {Array} events - Array of events
     * @returns {Array} Array of unique event types
     */
    getEventTypes(events) {
        return [...new Set(events.map(event => event.type))];
    }

    /**
     * Gets the localized label for an event type.
     * @param {string} type - The event type
     * @returns {string} Localized event type label
     */
    getEventTypeLabel(type) {
        const labels = {
            identity: this.identityPicker.rules.language.identityChangeType,
            attribute: this.identityPicker.rules.language.attributeChangeType,
            task: this.identityPicker.rules.language.taskChangeType
        };
        return labels[type] || type;
    }

    /**
     * Generates HTML for identity change header.
     * @param {Object} event - The identity change event
     * @returns {string} HTML string for identity change header
     */
    generateIdentityChangeHeader(event) {
        if (!event) return '';
        return `
            <div class="ip-identity-change-header">
                <h3 class="change-type">${event.changeTypeText}</h3>
                <span title="${this.identityPicker.rules.language.author}">${event.authorName}</span>
            </div>
        `;
    }

    /**
     * Generates HTML table for attribute changes.
     * @param {Array} attributeEvents - Array of attribute change events
     * @returns {string} HTML string for attribute changes table
     */
    generateAttributeChangesTable(attributeEvents) {
        if (attributeEvents.length === 0) return '';
        let html = `<div class="ip-attribute-changes-list">`;
        attributeEvents.forEach(event => {
            const certInfo = getCertificationInfo(event.data.attribute_key, event.data.certification_processus, this.identityPicker.rules.referential, this.identityPicker.rules.language);
            const certLabel = certInfo.label || event.data.certification_processus || '-';
            const certTitle = certInfo.description || '';
            let attrValue = event.attributeValue || '-';
            if (event.data.attribute_key === "gender") {
                attrValue = event.attributeValue === '1' ? 'M' : event.attributeValue === '2' ? 'F' : 'ND';
            }
            html += `
                <div class="ip-attribute-change-item">
                    <div class="ip-attribute-name">${event.attributeLabel}</div>
                    <div class="ip-attribute-value">${attrValue}</div>
                    <div class="ip-attribute-certification" title="${certTitle}">
                        <span class="ip-certification-label">${this.identityPicker.rules.language.attributeCertification || 'Certification'}:</span>
                        <span class="ip-certification-value">${certLabel}</span>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        return html;
    }

    /**
     * Gets certification information for an attribute.
     * @param {string} attributeKey - The attribute key
     * @param {string} certificationProcess - The certification process code
     * @returns {Object} Object containing label and description for the certification
     */

    /**
     * Copies text to clipboard and shows feedback.
     * @param {string} text - Text to copy
     * @param {HTMLElement} button - The button element clicked
     * @returns {void}
     */
    copyToClipboard(text, button) {
        navigator.clipboard.writeText(text).then(() => {
            const originalText = button.textContent;
            button.textContent = this.identityPicker.rules.language.copied || 'Copied!';
            setTimeout(() => {
                button.textContent = originalText;
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy: ', err);
        });
    }

    /**
     * Generates HTML for task change display.
     * @param {Object} event - The task change event
     * @returns {string} HTML string for task change
     */
    generateTaskChangeHTML(event) {
        return `
            <div class="ip-task-change">
                <h3 class="change-type">${event.changeTypeText}</h3>
                <span title="${this.identityPicker.rules.language.author}">${event.authorName}</span><br>
                <button class="ip-copy-button" data-task-code="${event.taskCode}">
                    ${event.taskCode ? `${event.taskCode.substring(0, 15)}...` : 'Copy'}
                </button>
                <small>${this.generateTaskMetadata(event.data.task.metadata)}</small>
            </div>
        `;
    }

    /**
     * Generates HTML for task metadata display.
     * @param {Object} metadata - The task metadata object
     * @returns {string} HTML string for task metadata
     */
    generateTaskMetadata(metadata) {
        if (!metadata || Object.keys(metadata).length === 0) return '';
        let html = `<div class="ip-task-metadata">`;
        for (const [key, value] of Object.entries(metadata)) {
            html += `<div><strong>${key}:</strong> ${value}</div>`;
        }
        html += `</div>`;
        return html;
    }

    /**
     * Formats a timestamp into a localized date string.
     * @param {number|Date} timestamp - The timestamp to format
     * @returns {string} Formatted date string
     */
    formatDate(timestamp) {
        return new Date(timestamp).toLocaleString(this.identityPicker.config.locale, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    /**
     * Formats a date for grouping in the timeline.
     * @param {Date} date - The date to format
     * @returns {string} Formatted date string for grouping
     */
    formatDateForGrouping(date) {
        return date.toLocaleString(this.identityPicker.config.locale, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }
}