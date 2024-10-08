package fr.paris.lutece.plugins.identitypicker.service;

import fr.paris.lutece.portal.service.rbac.Permission;
import fr.paris.lutece.portal.service.rbac.ResourceIdService;
import fr.paris.lutece.portal.service.rbac.ResourceType;
import fr.paris.lutece.portal.service.rbac.ResourceTypeManager;
import fr.paris.lutece.util.ReferenceList;

import java.util.Locale;

/**
 * IdentityPickerResourceService
 */
public class IdentityPickerResourceService extends ResourceIdService
{
    public static final String PERMISSION_SEARCH = "SEARCH";
    public static final String PERMISSION_VIEW = "VIEW";
    public static final String PERMISSION_CREATE = "CREATE";
    public static final String PERMISSION_UPDATE = "UPDATE";
    public static final String PERMISSION_CREATE_TASK = "CREATE_TASK";
    public static final String PLUGIN_NAME = "identitypicker";
    public static final String RESOURCE_TYPE = "IDENTITYPICKER";
    private static final String PROPERTY_LABEL_RESOURCE_TYPE = "identitypicker.permission.label.resourceType";
    private static final String PROPERTY_LABEL_VIEW = "identitypicker.permission.label.view";
    private static final String PROPERTY_LABEL_SEARCH = "identitypicker.permission.label.search";
    private static final String PROPERTY_LABEL_CREATE = "identitypicker.permission.label.create";
    private static final String PROPERTY_LABEL_UPDATE = "identitypicker.permission.label.update";
    private static final String PROPERTY_LABEL_CREATE_TASK = "identitypicker.permission.label.createTask";

    /**
     * Constructor
     */
    public IdentityPickerResourceService( )
    {
        setPluginName( PLUGIN_NAME );
    }

    /**
     * Initializes the service
     */
    @Override
    public void register( )
    {
        ResourceType resourceType = new ResourceType( );
        resourceType.setResourceIdServiceClass( IdentityPickerResourceService.class.getName( ) );
        resourceType.setPluginName( PLUGIN_NAME );
        resourceType.setResourceTypeKey( RESOURCE_TYPE );
        resourceType.setResourceTypeLabelKey( PROPERTY_LABEL_RESOURCE_TYPE );

        registerPermission( resourceType, PERMISSION_SEARCH, PROPERTY_LABEL_SEARCH );
        registerPermission( resourceType, PERMISSION_VIEW, PROPERTY_LABEL_VIEW );
        registerPermission( resourceType, PERMISSION_CREATE, PROPERTY_LABEL_CREATE );
        registerPermission( resourceType, PERMISSION_UPDATE, PROPERTY_LABEL_UPDATE );
        registerPermission( resourceType, PERMISSION_CREATE_TASK, PROPERTY_LABEL_CREATE_TASK );

        ResourceTypeManager.registerResourceType( resourceType );
    }

    /**
     * Helper method to register a permission
     * 
     * @param resourceType
     *            The ResourceType to register the permission to
     * @param permissionKey
     *            The key of the permission
     * @param permissionTitleKey
     *            The title key of the permission
     */
    private void registerPermission( ResourceType resourceType, String permissionKey, String permissionTitleKey )
    {
        Permission permission = new Permission( );
        permission.setPermissionKey( permissionKey );
        permission.setPermissionTitleKey( permissionTitleKey );
        resourceType.registerPermission( permission );
    }

    /**
     * Returns a list of resource ids
     * 
     * @param locale
     *            The current locale
     * @return The list of resource ids
     */
    @Override
    public ReferenceList getResourceIdList( Locale locale )
    {
        return new ReferenceList( );
    }

    /**
     * Returns the Title of a given resource
     * 
     * @param strId
     *            The Id of the resource
     * @param locale
     *            The current locale
     * @return The Title of a given resource
     */
    @Override
    public String getTitle( String strId, Locale locale )
    {
        return "";
    }
}
