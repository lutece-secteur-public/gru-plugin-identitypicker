package fr.paris.lutece.plugins.identitypicker.service.rs;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.BeanParam;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.PUT;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;

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

/**
 * REST service for identity management operations.
 */
@Path(RestConstants.BASE_PATH + IdentityRestConstants.API_PATH)
public class IdentityRestService {

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
            List<IdentityDto> identities = IdentityPickerService.getInstance().searchIdentities(searchCriteria, AdminUserService.getAdminUser(request));
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
            Optional<IdentityDto> identity = IdentityPickerService.getInstance().getIdentity(customerId, AdminUserService.getAdminUser(request));
            return identity.map(Response::ok)
                           .orElse(Response.status(Response.Status.NOT_FOUND))
                           .build();
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
            Rules rules = IdentityPickerService.getInstance().getRules(request, AdminUserService.getAdminUser(request));
            return Response.ok(rules).build();
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

            return Response.ok(permissions).build();
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
            IdentityChangeResponse response = IdentityPickerService.getInstance().createIdentity(data, AdminUserService.getAdminUser(servletRequest));
            int httpCode = IdentityPickerService.getInstance().getHttpCodeFromResponse(response);
            return Response.status(httpCode).entity(response).build();
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
            Optional<IdentityDto> previousIdentity = IdentityPickerService.getInstance().getIdentity(customerId, AdminUserService.getAdminUser(servletRequest));
            if (previousIdentity.isEmpty()) {
                return Response.status(Response.Status.NOT_FOUND).entity(IdentityRestConstants.ERROR_NOT_FOUND_RESOURCE).build();
            }
            IdentityChangeResponse response = IdentityPickerService.getInstance().updateIdentity(customerId, data, previousIdentity.get(), AdminUserService.getAdminUser(servletRequest));
            int httpCode = IdentityPickerService.getInstance().getHttpCodeFromResponse(response);
            return Response.status(httpCode).entity(response).build();
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
        
        Optional<IdentityHistory> history = IdentityPickerService.getInstance().getIdentityHistory(customerId, AdminUserService.getAdminUser(request));
        return history.map(Response::ok)
                      .orElse(Response.status(Response.Status.NOT_FOUND))
                      .build();
    }

    @GET
    @Path("/identity/{customer_id}/tasks")
    @Produces(MediaType.APPLICATION_JSON)
    public Response getIdentityTasks(@PathParam("customer_id") String customerId, @Context HttpServletRequest request) {
        if (!isAuthorized(request, IdentityPickerResourceService.PERMISSION_VIEW)) {
            return Response.status(Response.Status.FORBIDDEN).entity(IdentityRestConstants.ERROR_UNAUTHORIZED).build();
        }
        
        Optional<List<IdentityTaskDto>> tasks = IdentityPickerService.getInstance().getIdentityTasks(customerId, AdminUserService.getAdminUser(request));
        return tasks.map(Response::ok)
                    .orElse(Response.status(Response.Status.NOT_FOUND))
                    .build();
    }

    @POST
    @Path("/identity/{customer_id}/tasks/create-account-task")
    @Produces(MediaType.APPLICATION_JSON)
    public Response createAccountTask(@PathParam("customer_id") String customerId, @Context HttpServletRequest request) {
        if (!isAuthorized(request, IdentityPickerResourceService.PERMISSION_CREATE_TASK)) {
            return Response.status(Response.Status.FORBIDDEN).entity(IdentityRestConstants.ERROR_UNAUTHORIZED).build();
        }
        try {
            IdentityTaskCreateResponse response = IdentityPickerService.getInstance().createAccountTask(customerId, AdminUserService.getAdminUser(request));
            return Response.status(Response.Status.CREATED).entity(response).build();
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
            IdentityTaskCreateResponse response = IdentityPickerService.getInstance().createEmailValidationTask(customerId, AdminUserService.getAdminUser(request));
            return Response.status(Response.Status.CREATED).entity(response).build();
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
        return Response.ok(identities).build();
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
