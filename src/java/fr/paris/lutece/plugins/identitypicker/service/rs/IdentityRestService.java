package fr.paris.lutece.plugins.identitypicker.service.rs;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import jakarta.enterprise.context.RequestScoped;
import jakarta.inject.Inject;
import jakarta.inject.Named;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.ws.rs.BeanParam;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import fr.paris.lutece.api.user.User;
import fr.paris.lutece.plugins.identitypicker.business.IdentitySearchCriteria;
import fr.paris.lutece.plugins.identitypicker.business.Rules;
import fr.paris.lutece.plugins.identitypicker.service.IdentityPickerResourceService;
import fr.paris.lutece.plugins.identitypicker.service.IdentityPickerService;
import fr.paris.lutece.plugins.identitystore.v3.web.rs.dto.common.IdentityDto;
import fr.paris.lutece.plugins.identitystore.v3.web.rs.dto.crud.IdentityChangeResponse;
import fr.paris.lutece.plugins.identitystore.v3.web.rs.dto.history.IdentityHistory;
import fr.paris.lutece.plugins.identitystore.v3.web.rs.dto.task.IdentityTaskCreateResponse;
import fr.paris.lutece.plugins.identitystore.v3.web.rs.dto.task.IdentityTaskDto;
import fr.paris.lutece.plugins.identitystore.web.exception.IdentityStoreException;
import fr.paris.lutece.plugins.rest.service.RestConstants;
import fr.paris.lutece.portal.business.rbac.RBAC;
import fr.paris.lutece.portal.business.user.AdminUser;
import fr.paris.lutece.portal.service.admin.AdminUserService;
import fr.paris.lutece.portal.service.rbac.RBACService;
import fr.paris.lutece.portal.service.util.AppLogService;
import fr.paris.lutece.util.httpaccess.HttpAccessException;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * REST service for identity management operations.
 */
@RequestScoped
@Path(RestConstants.BASE_PATH + IdentityRestConstants.API_PATH)
public class IdentityRestService {

    /**
     * Shared Jackson mapper. JSON must be serialized explicitly with Jackson (not left to the
     * JAX-RS default provider, which is JSON-B/Yasson on Liberty and ignores {@code @JsonProperty}),
     * so the snake_case attribute names the front-end consumes (e.g. customer_id) are preserved.
     */
    private static final ObjectMapper _mapper = new ObjectMapper();

    @Inject
    @Named( "identitypicker.identityPickerService" )
    private IdentityPickerService _identityPickerService;

    /**
     * Builds a JSON response by serializing the payload with Jackson.
     *
     * @param status the HTTP status code
     * @param payload the object to serialize
     * @return a JSON response, or an internal-server-error response if serialization fails
     */
    private Response jsonResponse(int status, Object payload) {
        try {
            return Response.status(status).entity(_mapper.writeValueAsString(payload)).type(MediaType.APPLICATION_JSON).build();
        } catch (JsonProcessingException e) {
            AppLogService.error(IdentityRestConstants.ERROR_INTERNAL_SERVER, e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Search for identities based on given criteria.
     *
     * @param searchCriteria The search criteria for identities
     * @param request The HTTP servlet request
     * @return Response containing the search results or error information
     */
    @GET
    @Path("/search")
    @Produces(MediaType.APPLICATION_JSON)
    public Response identitySearch(@BeanParam IdentitySearchCriteria searchCriteria, @Context HttpServletRequest request) {
        if (!isAuthorized(request, IdentityPickerResourceService.PERMISSION_SEARCH)) {
            return Response.status(Response.Status.FORBIDDEN).entity(IdentityRestConstants.ERROR_UNAUTHORIZED).build();
        }
        if (!searchCriteria.isValid()) {
            return Response.status(Response.Status.BAD_REQUEST).entity(IdentityRestConstants.ERROR_INVALID_PARAMETERS).build();
        }
        try {
            List<IdentityDto> identities = _identityPickerService.searchIdentities(searchCriteria, AdminUserService.getAdminUser(request));
            return createResponse(identities);
        } catch (IdentityStoreException e) {
            AppLogService.error(IdentityRestConstants.ERROR_INTERNAL_SERVER, e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Retrieve an identity by customer ID.
     *
     * @param customerId The customer ID to look up
     * @param request The HTTP servlet request
     * @return Response containing the identity information or error details
     */
    @GET
    @Path("/identity/{customer_id}")
    @Produces(MediaType.APPLICATION_JSON)
    public Response getIdentity(@PathParam("customer_id") String customerId, @Context HttpServletRequest request) {
        if (!isAuthorized(request, IdentityPickerResourceService.PERMISSION_VIEW)) {
            return Response.status(Response.Status.FORBIDDEN).entity(IdentityRestConstants.ERROR_UNAUTHORIZED).build();
        }
        try {
            Optional<IdentityDto> identity = _identityPickerService.getIdentity(customerId, AdminUserService.getAdminUser(request));
            if (identity.isPresent()) {
                return jsonResponse(Response.Status.OK.getStatusCode(), identity.get());
            }
            return Response.status(Response.Status.NOT_FOUND).build();
        } catch (IdentityStoreException e) {
            AppLogService.error(IdentityRestConstants.ERROR_INTERNAL_SERVER, e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Retrieve the rules for identity picking.
     *
     * @param request The HTTP servlet request
     * @return Response containing the rules or error information
     */
    @GET
    @Path("/rules")
    @Produces(MediaType.APPLICATION_JSON)
    public Response getRules(@Context HttpServletRequest request) {
        if (!hasAnyPermission(request, IdentityPickerResourceService.PERMISSION_SEARCH, IdentityPickerResourceService.PERMISSION_CREATE, IdentityPickerResourceService.PERMISSION_UPDATE, IdentityPickerResourceService.PERMISSION_VIEW)) {
            return Response.status(Response.Status.FORBIDDEN).entity(IdentityRestConstants.ERROR_UNAUTHORIZED).build();
        }
        try {
            Rules rules = _identityPickerService.getRules(request, AdminUserService.getAdminUser(request));
            return jsonResponse(Response.Status.OK.getStatusCode(), rules);
        } catch (IdentityStoreException e) {
            if (e.getCause() instanceof HttpAccessException) {
                AppLogService.error("Unknown host error while fetching rules", e);
                return Response.status(Response.Status.BAD_REQUEST)
                               .entity("Unable to connect to the referential service. Please check the configuration.")
                               .build();
            }
            AppLogService.error(IdentityRestConstants.ERROR_INTERNAL_SERVER, e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                           .entity("An internal server error occurred. Please try again later.")
                           .build();
        }
    }

    /**
     * Retrieve the permissions for the current user.
     *
     * @param request The HTTP servlet request
     * @return Response containing the user's permissions or error information
     */
    @GET
    @Path("/permissions")
    @Produces(MediaType.APPLICATION_JSON)
    public Response getUserPermissions(@Context HttpServletRequest request) {
        AdminUser adminUser = AdminUserService.getAdminUser(request);
        if (adminUser == null) {
            return Response.status(Response.Status.FORBIDDEN).entity(IdentityRestConstants.ERROR_UNAUTHORIZED).build();
        }
        try {
            Map<String, Boolean> permissions = new HashMap<>();
            permissions.put(IdentityPickerResourceService.PERMISSION_SEARCH, isAuthorized(request, IdentityPickerResourceService.PERMISSION_SEARCH));
            permissions.put(IdentityPickerResourceService.PERMISSION_CREATE, isAuthorized(request, IdentityPickerResourceService.PERMISSION_CREATE));
            permissions.put(IdentityPickerResourceService.PERMISSION_UPDATE, isAuthorized(request, IdentityPickerResourceService.PERMISSION_UPDATE));
            permissions.put(IdentityPickerResourceService.PERMISSION_VIEW, isAuthorized(request, IdentityPickerResourceService.PERMISSION_VIEW));
            permissions.put(IdentityPickerResourceService.PERMISSION_CREATE_TASK, isAuthorized(request, IdentityPickerResourceService.PERMISSION_CREATE_TASK));

            return jsonResponse(Response.Status.OK.getStatusCode(), permissions);
        } catch (Exception e) {
            AppLogService.error(IdentityRestConstants.ERROR_INTERNAL_SERVER, e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Create a new identity.
     *
     * @param data The identity data to create
     * @param servletRequest The HTTP servlet request
     * @return Response containing the result of the creation or error information
     */
    @POST
    @Path("/identity")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public Response createIdentity(Map<String, Object> data, @Context HttpServletRequest servletRequest) {
        if (!isAuthorized(servletRequest, IdentityPickerResourceService.PERMISSION_CREATE)) {
            return Response.status(Response.Status.FORBIDDEN).entity(IdentityRestConstants.ERROR_UNAUTHORIZED).build();
        }
        try {
            IdentityChangeResponse response = _identityPickerService.createIdentity(data, AdminUserService.getAdminUser(servletRequest));
            int httpCode = _identityPickerService.getHttpCodeFromResponse(response);
            return jsonResponse(httpCode, response);
        } catch (IdentityStoreException e) {
            AppLogService.error(IdentityRestConstants.ERROR_INTERNAL_SERVER, e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Update an existing identity.
     *
     * @param customerId The customer ID of the identity to update
     * @param data The updated identity data
     * @param servletRequest The HTTP servlet request
     * @return Response containing the result of the update or error information
     */
    @PUT
    @Path("/identity/{customer_id}")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public Response updateIdentity(@PathParam("customer_id") String customerId, Map<String, Object> data, @Context HttpServletRequest servletRequest) {
        if (!isAuthorized(servletRequest, IdentityPickerResourceService.PERMISSION_UPDATE)) {
            return Response.status(Response.Status.FORBIDDEN).entity(IdentityRestConstants.ERROR_UNAUTHORIZED).build();
        }
        try {
            Optional<IdentityDto> previousIdentity = _identityPickerService.getIdentity(customerId, AdminUserService.getAdminUser(servletRequest));
            if (previousIdentity.isEmpty()) {
                return Response.status(Response.Status.NOT_FOUND).entity(IdentityRestConstants.ERROR_NOT_FOUND_RESOURCE).build();
            }
            IdentityChangeResponse response = _identityPickerService.updateIdentity(customerId, data, previousIdentity.get(), AdminUserService.getAdminUser(servletRequest));
            int httpCode = _identityPickerService.getHttpCodeFromResponse(response);
            return jsonResponse(httpCode, response);
        } catch (IdentityStoreException e) {
            AppLogService.error(IdentityRestConstants.ERROR_INTERNAL_SERVER, e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Retrieve the history of an identity by customer ID.
     *
     * @param customerId The customer ID to look up
     * @param request The HTTP servlet request
     * @return Response containing the identity history or error details
     */
    @GET
    @Path("/identity/{customer_id}/history")
    @Produces(MediaType.APPLICATION_JSON)
    public Response getIdentityHistory(@PathParam("customer_id") String customerId, @Context HttpServletRequest request) {
        if (!isAuthorized(request, IdentityPickerResourceService.PERMISSION_VIEW)) {
            return Response.status(Response.Status.FORBIDDEN).entity(IdentityRestConstants.ERROR_UNAUTHORIZED).build();
        }
        
        try {
            Optional<IdentityHistory> history = _identityPickerService.getIdentityHistory(customerId, AdminUserService.getAdminUser(request));
            
            if (history.isPresent()) {
                IdentityHistory historyData = history.get();
                return jsonResponse(Response.Status.OK.getStatusCode(), historyData);
            } else {
                Map<String, Object> emptyHistory = new HashMap<>();
                emptyHistory.put("identity_changes", new java.util.ArrayList<>());
                emptyHistory.put("attribute_histories", new java.util.ArrayList<>());
                return jsonResponse(Response.Status.OK.getStatusCode(), emptyHistory);
            }
        } catch (Exception e) {
            AppLogService.error("Error processing history for customer {}", customerId, e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                           .entity("Error processing history: " + e.getMessage())
                           .build();
        }
    }

    @GET
    @Path("/identity/{customer_id}/tasks")
    @Produces(MediaType.APPLICATION_JSON)
    public Response getIdentityTasks(@PathParam("customer_id") String customerId, @Context HttpServletRequest request) {
        if (!isAuthorized(request, IdentityPickerResourceService.PERMISSION_VIEW)) {
            return Response.status(Response.Status.FORBIDDEN).entity(IdentityRestConstants.ERROR_UNAUTHORIZED).build();
        }
        
        try {
            Optional<List<IdentityTaskDto>> tasks = _identityPickerService.getIdentityTasks(customerId, AdminUserService.getAdminUser(request));
            
            if (tasks.isPresent()) {
                List<IdentityTaskDto> tasksData = tasks.get();
                return jsonResponse(Response.Status.OK.getStatusCode(), tasksData);
            } else {
                return jsonResponse(Response.Status.OK.getStatusCode(), new java.util.ArrayList<>());
            }
        } catch (Exception e) {
            AppLogService.error("Error processing tasks for customer {}", customerId, e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                           .entity("Error processing tasks: " + e.getMessage())
                           .build();
        }
    }

    @POST
    @Path("/identity/{customer_id}/tasks/create-account-task")
    @Produces(MediaType.APPLICATION_JSON)
    public Response createAccountTask(@PathParam("customer_id") String customerId, @Context HttpServletRequest request) {
        if (!isAuthorized(request, IdentityPickerResourceService.PERMISSION_CREATE_TASK)) {
            return Response.status(Response.Status.FORBIDDEN).entity(IdentityRestConstants.ERROR_UNAUTHORIZED).build();
        }
        try {
            IdentityTaskCreateResponse response = _identityPickerService.createAccountTask(customerId, AdminUserService.getAdminUser(request));
            return jsonResponse(Response.Status.CREATED.getStatusCode(), response);
        } catch (IdentityStoreException e) {
            AppLogService.error(IdentityRestConstants.ERROR_INTERNAL_SERVER, e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).build();
        }
    }

    @POST
    @Path("/identity/{customer_id}/tasks/validate-email-task")
    @Produces(MediaType.APPLICATION_JSON)
    public Response createEmailValidationTask(@PathParam("customer_id") String customerId, @Context HttpServletRequest request) {
        if (!isAuthorized(request, IdentityPickerResourceService.PERMISSION_CREATE_TASK)) {
            return Response.status(Response.Status.FORBIDDEN).entity(IdentityRestConstants.ERROR_UNAUTHORIZED).build();
        }
        try {
            IdentityTaskCreateResponse response = _identityPickerService.createEmailValidationTask(customerId, AdminUserService.getAdminUser(request));
            return jsonResponse(Response.Status.CREATED.getStatusCode(), response);
        } catch (IdentityStoreException e) {
            AppLogService.error(IdentityRestConstants.ERROR_INTERNAL_SERVER, e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    /**
     * Create a response for the list of identities.
     *
     * @param identities The list of identities
     * @return Response containing the identities or a not found status
     */
    private Response createResponse(List<IdentityDto> identities) {
        if (identities.isEmpty()) {
            return Response.status(Response.Status.NOT_FOUND).entity(IdentityRestConstants.EMPTY_OBJECT).build();
        }
        return jsonResponse(Response.Status.OK.getStatusCode(), identities);
    }

    /**
     * Checks if the current user is authorized to perform an action.
     *
     * @param request The HTTP servlet request
     * @param permission The permission to check
     * @return true if authorized, false otherwise
     */
    private boolean isAuthorized(HttpServletRequest request, String permission) {
        AdminUser adminUser = AdminUserService.getAdminUser(request);
        return adminUser != null && (permission == null || RBACService.isAuthorized(IdentityPickerResourceService.RESOURCE_TYPE, RBAC.WILDCARD_RESOURCES_ID, permission, (User) adminUser));
    }

    /**
     * Checks if the current user has at least one of the given permissions.
     *
     * @param request The HTTP servlet request
     * @param permissions The permissions to check
     * @return true if the user has at least one permission, false otherwise
     */
    private boolean hasAnyPermission(HttpServletRequest request, String... permissions) {
        AdminUser adminUser = AdminUserService.getAdminUser(request);
        if (adminUser == null) {
            return false;
        }
        for (String permission : permissions) {
            if (RBACService.isAuthorized(IdentityPickerResourceService.RESOURCE_TYPE, RBAC.WILDCARD_RESOURCES_ID, permission, (User) adminUser)) {
                return true;
            }
        }
        return false;
    }

}
