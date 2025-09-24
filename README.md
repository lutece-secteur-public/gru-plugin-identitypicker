# IdentityPicker Plugin

## Table of Contents
- [Description](#Description)
  - [Features](#features)
- [Configuration](#configuration)
- [Usage](#Usage)
  - [Permissions](#permissions)
  - [IdentityPicker Macro](#identitypicker-macro)
  - [Macro Parameters](#macro-parameters)
  - [Detailed Config Object Fields](#detailed-config-object-fields)
  - [Using the Macro](#using-the-macro)
  - [Endpoints specification](#Endpoints-specification)
  - [Query Parameters for Search](#query-parameters-for-search)
  - [Error Handling](#error-handling)
  
  
  
## Description
IdentityPicker is plugin that proposes a macro for searching and managing identities within the Identity Store. It also provides a user-friendly interface for looking up and managing identities in your application. This macro consumes private REST services that call the IdentityStore services. 

### Features
- Search identities by email
- Search identities by last name, first name, and birth date
- RBAC-based access control
- Identity selection and field mapping
- Identity history
- Task creation
- Tasks history
- Identity creation and update
- fill selected Fields values in the html page context after identity selection

## Configuration
Set the default client code in the `identitypicker.properties` file:

```
identitypicker.default.client.code=your_client_code_here
identitypicker.identitystore.ApiEndPointUrl=your api url
identitypicker.identitystore.AccessManagerEndPointUrl=your am url
identitypicker.identitystore.AccessManagerCredentials=your token

```

If necessary (creation and update), Set the  `geocodesclient.properties` file:
```
    geocodes.identitystore.ApiEndPointUrl=your api url
    geocodes.identitystore.accessManagerEndPointUrl=
    geocodes.identitystore.accessManagerCredentials=
    geocodes.override.default.date.pattern=yyyy-MM-dd
```

## Usage
- The service requires BackOffice authentication
- Access is controlled by RBAC permissions
- Users must have the appropriate permissions on the `IDENTITYPICKER` resource type

### Permissions
The IdentityPicker functionality is controlled by RBAC permissions:
- `SEARCH`: Allows the user to search for identities.
- `VIEW` :  Allows the user to view identity, history and tasks by `customer_id`.
- `CREATE`: Allows the user to create new identity.
- `UPDATE`: Allows the user to update identity by `customer_id`.
- `CREATE_TASK`: Allows the user to create task by `customer_id`.



### IdentityPicker Macro
The IdentityPicker plugin provides a Freemarker macro for easy integration into your templates.

To include the macro, use the autoinclude feature in the plugin.xml file, or use this code above in the Freemarker template:
```freemarker
<#include "/admin/plugins/identitypicker/identitypicker.ftl" />
```

### Macro Parameters
- `search` (default: true): Enables or disables the search functionality.
- `creation` (default: false): Enables or disables the identity creation functionality.
- `update` (default: false): Enables or disables the identity update functionality.
- `selection` (default: true): Enables or disables the selection functionality.
- `createTask` (default: false): Enables or disables the task functionality.
- `fieldMappings` (default: "{}"): A JSON object mapping form field IDs to identity attributes, to return and fill in the html page.
- `cuid` (default: ""): Specifies the Customer Unique Identifier.
- `autoFill` (default: false): Enables or disables automatic filling of form fields with selected identity information when cuid is not empty.
- `btnLabelShow` (default: true): Shows or hides the button label.
- `btnIcon` (default: ""): Sets the button icon.
- `btnLabel` (default: "Ouvrir la recherche d'identité"): Sets the button label text.
- `config` (default: "{}"): A JSON object for advanced configuration.

### Detailed Config Object Fields

The `config` parameter accepts a JSON object with the following fields. These can be used to override the default configuration:

| Field | Sub-fields |
|-------|------------|
| `choices` | `minSearchLength`, `debounceTime` |
| `display` | `modalMaxHeight` |
| `endpoints` | `permissions`, `search`, `identity`, `history`, `tasks`, `rules`, `countries`, `cities` |

### Using the Macro
When `selection` is set to true, the IdentityPicker allows users to select an identity from the search results. 
The selected identity's attributes can be automatically filled into html elements on your page.

```html
<form action="save.jsp" method="post">
 <div class="container">
	<div class="row">
	  <div class="col-md-6 offset-md-3">
		<div class="card">
		  <div class="card-body d-flex flex-column justify-content-center">
			<div class="row align-items-center">
			  <div class="col">
				<input type="hidden" id="customer-id" name="customer-id" value="${cuid!''}">
				<h1 class="mb-3">
				  <span id="first-name" class="me-2"></span><span id="family-name"></span>
				</h1>
				<p class="mb-0">Birthdate : <span id="birthdate"></span></p>
			  </div>
			  <div class="col-auto">
				   <@identityPicker 
					 search=true
					 creation=true 
					 update=true 
					 selection=true
					 createTask=true
					 fieldMappings="{ 'customer-id': 'customer_id', 'address': 'address', 'family-name': 'family_name', 'first-name': 'first_name', 'birthdate' : 'birthdate' }"
					 cuid=cuid!''
					 autoFill=true
				   />
			  </div>
			</div>
		  </div>
		</div>
	  </div>
	</div>
   <button type="submit" class="btn btn-primary">Save</button>
  </div>
</form>
```


### Endpoints specification
The plugin exposes REST endpoints for searching and retrieving identities.

| Endpoint | HTTP Method | Authentication | Specific Permission |
|----------|-------------|-----------------|---------------------|
| `/rest/identitystore/api/permissions` | GET | AdminUser | No additional permission |
| `/rest/identitystore/api/rules` | GET | AdminUser | At least one permission required  
| `/rest/identitystore/api/search` | GET | AdminUser | `PERMISSION_SEARCH` |
| `/rest/identitystore/api/identity/{customer_id}` | GET | AdminUser | `PERMISSION_VIEW` |
| `/rest/identitystore/api/identity/{customer_id}/history` | GET | AdminUser | `PERMISSION_VIEW` |
| `/rest/identitystore/api/identity/{customer_id}/tasks` | GET | AdminUser | `PERMISSION_VIEW` |
| `/rest/identitystore/api/identity/{customer_id}/tasks/create-account-task` | POST | AdminUser | `PERMISSION_CREATE_TASK` |
| `/rest/identitystore/api/identity/{customer_id}/tasks/validate-email-task` | POST | AdminUser | `PERMISSION_CREATE_TASK` |
| `/rest/identitystore/api/identity` | POST | AdminUser | `PERMISSION_CREATE` |
| `/rest/identitystore/api/identity/{customer_id}` | PUT | AdminUser | `PERMISSION_UPDATE` |

### Query Parameters for Search
- `common_email`: Email address
- `common_lastname`: Last name
- `first_name`: First name
- `birthdate`: Birth date (format: DD/MM/YYYY)

### Error Handling
The service returns appropriate HTTP status codes and error messages:
- 400 Bad Request: Invalid parameters
- 403 Forbidden: Unauthorized access
- 404 Not Found: No matching identities
- 500 Internal Server Error: Unexpected errors

