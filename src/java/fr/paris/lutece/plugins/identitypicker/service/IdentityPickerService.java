package fr.paris.lutece.plugins.identitypicker.service;

import fr.paris.lutece.api.user.User;
import fr.paris.lutece.plugins.identitypicker.business.IdentitySearchCriteria;
import fr.paris.lutece.plugins.identitypicker.business.Referential;
import fr.paris.lutece.plugins.identitypicker.business.Rules;
import fr.paris.lutece.plugins.identitypicker.service.util.IdentityPickerI18nUtils;
import fr.paris.lutece.plugins.identitystore.v3.web.rs.dto.common.*;
import fr.paris.lutece.plugins.identitystore.v3.web.rs.dto.common.AuthorType;
import fr.paris.lutece.plugins.identitystore.v3.web.rs.dto.contract.ServiceContractDto;
import fr.paris.lutece.plugins.identitystore.v3.web.rs.dto.crud.*;
import fr.paris.lutece.plugins.identitystore.v3.web.rs.dto.history.IdentityHistory;
import fr.paris.lutece.plugins.identitystore.v3.web.rs.dto.history.IdentityHistoryGetResponse;
import fr.paris.lutece.plugins.identitystore.v3.web.rs.dto.search.*;
import fr.paris.lutece.plugins.identitystore.v3.web.rs.dto.task.IdentityResourceType;
import fr.paris.lutece.plugins.identitystore.v3.web.rs.dto.task.IdentityTaskCreateRequest;
import fr.paris.lutece.plugins.identitystore.v3.web.rs.dto.task.IdentityTaskCreateResponse;
import fr.paris.lutece.plugins.identitystore.v3.web.rs.dto.task.IdentityTaskDto;
import fr.paris.lutece.plugins.identitystore.v3.web.rs.dto.task.IdentityTaskListGetResponse;
import fr.paris.lutece.plugins.identitystore.v3.web.rs.dto.task.IdentityTaskType;
import fr.paris.lutece.plugins.identitystore.v3.web.rs.util.Constants;
import fr.paris.lutece.plugins.identitystore.v3.web.service.*;
import fr.paris.lutece.plugins.identitystore.web.exception.IdentityStoreException;
import fr.paris.lutece.portal.service.spring.SpringContextService;
import fr.paris.lutece.portal.service.util.AppLogService;
import fr.paris.lutece.portal.service.util.AppPropertiesService;
import org.apache.commons.lang3.StringUtils;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

import javax.servlet.http.HttpServletRequest;

/**
 * Service class for managing identities in the Identity Picker plugin.
 * This class provides methods for searching, creating, and updating identities,
 * as well as retrieving rules and referential data.
 */
public class IdentityPickerService {
    private static final String PROPERTY_DEFAULT_CLIENT_CODE = "identitypicker.default.client.code";
    private static final String BEAN_IDENTITY_SERVICE = "identityService.rest.httpAccess";
    private static final String BEAN_REFERENTIAL_SERVICE = "identity.ReferentialService";
    private static final String BEAN_CONTRACT_SERVICE = "identity.serviceContractService";
    private static final String ERROR_SEARCHING_IDENTITIES = "Error while searching identities: ";

    private static IdentityPickerService instance;
    private final IdentityService identityService;
    private final String clientCode;
    private final ReferentialService referentialService;
    private final ServiceContractServiceExtended serviceContract;

    /**
     * Private constructor for singleton pattern.
     * Initializes the necessary services and client code.
     */
    private IdentityPickerService() {
        this.identityService = SpringContextService.getBean(BEAN_IDENTITY_SERVICE);
        this.clientCode = AppPropertiesService.getProperty(PROPERTY_DEFAULT_CLIENT_CODE);
        this.referentialService = SpringContextService.getBean(BEAN_REFERENTIAL_SERVICE);
        this.serviceContract = SpringContextService.getBean(BEAN_CONTRACT_SERVICE);
    }

    /**
     * Gets the singleton instance of IdentityPickerService.
     * @return The IdentityPickerService instance
     */
    public static IdentityPickerService getInstance() {
        if (instance == null) {
            instance = new IdentityPickerService();
        }
        return instance;
    }

    /**
     * Searches for identities based on given criteria.
     * @param criteria The search criteria
     * @param luteceUser The current Lutece user
     * @return A list of matching IdentityDto objects
     * @throws IdentityStoreException If an error occurs during the search
     */
    public List<IdentityDto> searchIdentities(IdentitySearchCriteria criteria, User luteceUser) throws IdentityStoreException {
        IdentitySearchRequest searchRequest = createSearchRequest(criteria);
        return doSearch(searchRequest, createRequestAuthor(luteceUser));
    }

    /**
     * Gets a specific identity by customer ID.
     * @param customerId The customer ID
     * @param luteceUser The current Lutece user
     * @return An Optional containing the IdentityDto for the specified customer, or empty if not found
     * @throws IdentityStoreException If an error occurs while fetching the identity
     */
    public Optional<IdentityDto> getIdentity(String customerId, User luteceUser) throws IdentityStoreException {
        try {
            IdentitySearchResponse response = identityService.getIdentity(customerId, clientCode, createRequestAuthor(luteceUser));
            return isSuccess(response) ? Optional.of(response.getIdentities().get(0)) : Optional.empty();
        } catch (IdentityStoreException e) {
            AppLogService.error("Error while fetching identity", e);
            throw e;
        }
    }

    /**
     * Gets the rules and referential data.
     * @param luteceUser The current Lutece user
     * @return A Rules object containing referential data and service contract
     * @throws IdentityStoreException If an error occurs while fetching the data
     */
    public Rules getRules(HttpServletRequest request, User luteceUser) throws IdentityStoreException {
        try {
            RequestAuthor author = createRequestAuthor(luteceUser);
            Referential referential = new Referential(
                referentialService.getProcessList(clientCode, author),
                referentialService.getLevelList(clientCode, author),
                referentialService.getAttributeKeyList(clientCode, author)
            );
            ServiceContractDto contract = serviceContract
                .getActiveServiceContract(clientCode, clientCode, author)
                .getServiceContract();
            Map<String, Object> language = getLanguage( request );
            return new Rules(referential, contract, language);
        } catch (IdentityStoreException e) {
            AppLogService.error("Error while fetching referential data", e);
            throw e;
        }
    }

    /**
     * Creates a new identity.
     * @param data The identity data
     * @param luteceUser The current Lutece user
     * @return The response from the identity creation request
     * @throws IdentityStoreException If an error occurs during identity creation
     */
    public IdentityChangeResponse createIdentity(Map<String, Object> data, User luteceUser) throws IdentityStoreException {
        IdentityChangeRequest request = buildIdentityChangeRequest(data, null);
        return identityService.createIdentity(request, clientCode, createRequestAuthor(luteceUser));
    }

    /**
     * Updates an existing identity.
     * @param customerId The customer ID of the identity to update
     * @param data The updated identity data
     * @param previousIdentity The previous state of the identity
     * @param luteceUser The current Lutece user
     * @return The response from the identity update request
     * @throws IdentityStoreException If an error occurs during identity update
     */
    public IdentityChangeResponse updateIdentity(String customerId, Map<String, Object> data, IdentityDto previousIdentity, User luteceUser) throws IdentityStoreException {
        IdentityChangeRequest request = buildIdentityChangeRequest(data, previousIdentity);
        request.getIdentity().setCustomerId(customerId);
        
        List<AttributeDto> modifiedAttributes = request.getIdentity().getAttributes().stream()
            .filter(updatedAttr -> checkIfAttributeIsModified(previousIdentity, updatedAttr))
            .collect(Collectors.toList());
        
        if (modifiedAttributes.isEmpty()) {
            throw new IdentityStoreException("No attributes to update");
        }
        
        request.getIdentity().setAttributes(modifiedAttributes);
        request.getIdentity().setLastUpdateDate(previousIdentity.getLastUpdateDate());
        return identityService.updateIdentity(customerId, request, clientCode, createRequestAuthor(luteceUser));
    }

    /**
     * Gets the HTTP code from an IdentityChangeResponse.
     * @param response The IdentityChangeResponse
     * @return The HTTP code, or 500 if the response or status is null
     */
    public int getHttpCodeFromResponse(IdentityChangeResponse response) {
        return Optional.ofNullable(response)
            .map(IdentityChangeResponse::getStatus)
            .map(ResponseStatus::getHttpCode)
            .orElse(500);
    }

    /**
     * Builds an IdentityChangeRequest from the provided data.
     * @param data The identity data
     * @param previousIdentity The previous state of the identity (null for new identities)
     * @return An IdentityChangeRequest object
     */
    private IdentityChangeRequest buildIdentityChangeRequest(Map<String, Object> data, IdentityDto previousIdentity) {
        IdentityChangeRequest request = new IdentityChangeRequest();
        IdentityDto identity = new IdentityDto();
        List<AttributeDto> attributes = data.entrySet().stream()
            .filter(entry -> entry.getValue() instanceof Map)
            .map(entry -> {
                Map<String, String> attributeData = (Map<String, String>) entry.getValue();
                return buildAttribute(entry.getKey(), attributeData.get("value"), attributeData.get("certification"));
            })
            .filter(Objects::nonNull)
            .collect(Collectors.toList());

        handleBirthAttributes(attributes);

        identity.setAttributes(attributes);
        if (previousIdentity != null) {
            identity.setLastUpdateDate(previousIdentity.getLastUpdateDate());
        }
        request.setIdentity(identity);
        return request;
    }

    /**
     * Handles special cases for birth-related attributes.
     * @param attributes The list of attributes to process
     */
    private void handleBirthAttributes(List<AttributeDto> attributes) {
        Map<String, AttributeDto> attributeMap = attributes.stream()
            .collect(Collectors.toMap(AttributeDto::getKey, Function.identity()));

        copyBirthAttributeCertification(attributeMap, Constants.PARAM_BIRTH_PLACE_CODE, Constants.PARAM_BIRTH_PLACE);
        copyBirthAttributeCertification(attributeMap, Constants.PARAM_BIRTH_COUNTRY_CODE, Constants.PARAM_BIRTH_COUNTRY);
    }

    /**
     * Copies certification information from one attribute to another.
     * @param attributeMap The map of attributes
     * @param mainKey The key of the main attribute
     * @param codeKey The key of the code attribute
     */
    private void copyBirthAttributeCertification(Map<String, AttributeDto> attributeMap, String mainKey, String codeKey) {
        Optional.ofNullable(attributeMap.get(mainKey))
            .ifPresent(mainAttr -> 
                Optional.ofNullable(attributeMap.get(codeKey))
                    .filter(codeAttr -> StringUtils.isNotBlank(codeAttr.getCertifier()))
                    .ifPresent(codeAttr -> {
                        mainAttr.setCertifier(codeAttr.getCertifier());
                        mainAttr.setCertificationDate(codeAttr.getCertificationDate());
                    })
            );
    }

    /**
     * Checks if an attribute has been modified.
     * @param originalIdentity The original identity
     * @param updatedAttr The updated attribute
     * @return true if the attribute has been modified, false otherwise
     */
    private boolean checkIfAttributeIsModified(IdentityDto originalIdentity, AttributeDto updatedAttr) {
        return originalIdentity.getAttributes().stream()
            .filter(attr -> attr.getKey().equals(updatedAttr.getKey()))
            .findFirst()
            .map(originalAttr -> 
                !StringUtils.equals(originalAttr.getValue(), updatedAttr.getValue()) ||
                !StringUtils.equals(originalAttr.getCertifier(), updatedAttr.getCertifier())
            )
            .orElse(true);
    }

    /**
     * Builds an AttributeDto object.
     * @param key The attribute key
     * @param value The attribute value
     * @param certification The certification information
     * @return An AttributeDto object, or null if the value is blank
     */
    private AttributeDto buildAttribute(String key, String value, String certification) {
        if (StringUtils.isBlank(value)) {
            return null;
        }
        AttributeDto attr = new AttributeDto();
        attr.setKey(key);
        attr.setValue(key.equals("birthdate") ? convertToFrenchDate(value) : value);
        if (StringUtils.isNotBlank(certification)) {
            attr.setCertifier(certification);
            attr.setCertificationDate(new Date());
        }
        return attr;
    }

    /**
     * Converts a date from ISO format to French format.
     * @param isoDate The date in ISO format (yyyy-MM-dd)
     * @return The date in French format (dd/MM/yyyy), or an empty string if conversion fails
     */
    private String convertToFrenchDate(String isoDate) {
        if (StringUtils.isBlank(isoDate)) {
            return "";
        }
        try {
            LocalDate date = LocalDate.parse(isoDate);
            return date.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        } catch (Exception e) {
            AppLogService.error("Can't convert the date: " + isoDate, e);
            return isoDate;
        }
    }

    /**
     * Creates an IdentitySearchRequest from the given criteria.
     * @param criteria The search criteria
     * @return An IdentitySearchRequest object
     */
    private IdentitySearchRequest createSearchRequest(IdentitySearchCriteria criteria) {
        IdentitySearchRequest searchRequest = new IdentitySearchRequest();
        SearchDto search = new SearchDto();
        List<SearchAttribute> attributes = new ArrayList<>();
        if (criteria.hasCommonEmail()) {
            attributes.add(new SearchAttribute(Constants.PARAM_COMMON_EMAIL, criteria.getCommonEmail(), AttributeTreatmentType.STRICT));
        } else {
            attributes.add(new SearchAttribute(Constants.PARAM_FIRST_NAME, criteria.getFirstName(), AttributeTreatmentType.APPROXIMATED));
            attributes.add(new SearchAttribute(Constants.PARAM_COMMON_LASTNAME, criteria.getCommonLastName(), AttributeTreatmentType.APPROXIMATED));
            attributes.add(new SearchAttribute(Constants.PARAM_BIRTH_DATE, criteria.getBirthDate(), AttributeTreatmentType.STRICT));
        }
        search.setAttributes(attributes);
        searchRequest.setSearch(search);
        return searchRequest;
    }

/**
     * Performs the identity search.
     * @param searchRequest The search request
     * @param author The request author
     * @return A list of matching IdentityDto objects
     * @throws IdentityStoreException If an error occurs during the search
     */
    private List<IdentityDto> doSearch(IdentitySearchRequest searchRequest, RequestAuthor author) throws IdentityStoreException {
        try {
            IdentitySearchResponse searchResponse = identityService.searchIdentities(searchRequest, clientCode, author);
            return isSuccess(searchResponse) ? searchResponse.getIdentities() : Collections.emptyList();
        } catch (IdentityStoreException e) {
            AppLogService.error(ERROR_SEARCHING_IDENTITIES, e);
            throw e;
        }
    } 

     /**
     * Gets the history of changes for a specific identity.
     * @param customerId The customer ID of the identity
     * @param luteceUser The current Lutece user
     * @return An Optional containing the IdentityHistory, or empty if not found or an error occurs
     */
    public Optional<IdentityHistory> getIdentityHistory(String customerId, User luteceUser) {
        try {
            IdentityHistoryGetResponse response = identityService.getIdentityHistory(customerId, clientCode, createRequestAuthor(luteceUser));
            return isSuccess(response) ? Optional.ofNullable(response.getHistory()) : Optional.empty();
        } catch (IdentityStoreException e) {
            AppLogService.error("Error while fetching identity history", e);
            return Optional.empty();
        }
    }


    /**
     * Gets the status of a specific identity task.
     * @param customerId The customer ID of the identity
     * @param author The request author
     * @return An Optional containing the IdentityTaskDto, or empty if not found or an error occurs
     */

    public Optional<List<IdentityTaskDto>> getIdentityTasks(final String customerId, final User luteceUser) {
        try {
            final IdentityTaskListGetResponse response = identityService.getIdentityTaskList(customerId, IdentityResourceType.CUID.name(), clientCode, createRequestAuthor(luteceUser));
            return isSuccess(response) ? Optional.ofNullable(response.getTasks()) : Optional.empty();
        } catch (final IdentityStoreException e) {
            AppLogService.error("An error occurred trying to get the task list associated to identity " + customerId, e);
            return Optional.empty();
        }
    }

    /**
     * Create an account creation task for a specific identity.
     * @param customerId The customer ID of the identity
     * @param luteceUser The current Lutece user
     * @return The response from the identity task creation request
     * @throws IdentityStoreException If an error occurs during task creation
     */
    public IdentityTaskCreateResponse createAccountTask(String customerId, User luteceUser) throws IdentityStoreException {
        return createIdentityTask(customerId, IdentityTaskType.ACCOUNT_CREATION_REQUEST.name(), luteceUser);
    }

    /**
     * Create an email validation task for a specific identity.
     * @param customerId The customer ID of the identity
     * @param luteceUser The current Lutece user
     * @return The response from the identity task creation request
     * @throws IdentityStoreException If an error occurs during task creation
     */
    public IdentityTaskCreateResponse createEmailValidationTask(String customerId, User luteceUser) throws IdentityStoreException {
        return createIdentityTask(customerId, IdentityTaskType.EMAIL_VALIDATION_REQUEST.name(), luteceUser);
    }

    /**
     * Send a create request for a specific identity task.
     * @param customerId The customer ID of the identity
     * @param taskType The type of task to create
     * @param luteceUser The current Lutece user
     * @return The response from the identity task creation request
     * @throws IdentityStoreException If an error occurs during task creation
     */
    private IdentityTaskCreateResponse createIdentityTask(String customerId, String taskType, User luteceUser) throws IdentityStoreException {
        try {
            IdentityTaskCreateRequest taskCreateRequest = new IdentityTaskCreateRequest();
            IdentityTaskDto task = new IdentityTaskDto();
            task.setTaskType(taskType);
            task.setResourceType(IdentityResourceType.CUID.name());
            task.setResourceId(customerId);
            taskCreateRequest.setTask(task);

            return identityService.createIdentityTask(taskCreateRequest, clientCode, createRequestAuthor(luteceUser));
        } catch (IdentityStoreException e) {
            AppLogService.error("Error while creating identity task", e);
            throw e;
        }
    }

    /**
     * Gets the list of available languages.
     * @param request The HTTP request
     * @return A map of language codes and localized names
     */
     private Map<String, Object> getLanguage (HttpServletRequest request ) {
        return IdentityPickerI18nUtils.getAllLocalizedStrings( request.getLocale() );
    }

    /**
     * Creates a RequestAuthor object from a Lutece user.
     * @param luteceUser The Lutece user
     * @return A RequestAuthor object
     */
    private RequestAuthor createRequestAuthor(User luteceUser) {
        RequestAuthor author = new RequestAuthor();
        author.setName(luteceUser.getEmail());
        author.setType(AuthorType.application);
        return author;
    }

    /**
     * Checks if the response from the Identity Store API is successful.
     * @param apiResponse The response from the API
     * @return true if the response is successful, false otherwise
     */
    private boolean isSuccess(final ResponseDto apiResponse) {
        return Optional.ofNullable(apiResponse)
            .map(ResponseDto::getStatus)
            .map(ResponseStatus::getType)
            .map(type -> type == ResponseStatusType.SUCCESS || type == ResponseStatusType.INCOMPLETE_SUCCESS || type == ResponseStatusType.OK)
            .orElse(false);
    }
}