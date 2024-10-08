# IdentityPicker Plugin

## Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Configuration](#configuration)
- [REST API Usage](#rest-api-usage)
  - [Endpoints](#endpoints)
  - [Query Parameters for Search](#query-parameters-for-search)
  - [Examples](#examples)
- [Security](#security)
- [Permissions](#permissions)
- [Error Handling](#error-handling)
- [IdentityPicker Macro](#identitypicker-macro)
  - [Including the Macro](#including-the-macro)
  - [Macro Parameters](#macro-parameters)
  - [Detailed Config Object Fields](#detailed-config-object-fields)
  - [Using the Macro](#using-the-macro)

## Overview
IdentityPicker is a REST service plugin that enables searching and managing identities within the Identity Store. It also provides a user-friendly interface for looking up and managing identities in your application.

## Features
- Search identities by email
- Search identities by last name, first name, and birth date
- RBAC-based access control
- Identity selection and field mapping
- Identity history
- Task creation
- Tasks history
- Identity creation and update

## Configuration
Set the default client code in the `identitypicker.properties` file:

```
identitypicker.default.client.code=your_client_code_here
identitypicker.identitystore.ApiEndPointUrl=your_identitystore_url
identitypicker.identityquality.endpoint.identityPath=your_identity_path
identitypicker.identityquality.endpoint.stackTaskPath=your_task_path
```

## REST API Usage
The plugin exposes REST endpoints for searching and retrieving identities.

### Endpoints
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

### Examples
1. Search by email:
   ```
   GET /rest/identitystore/api/search?email=test@test.fr
   ```
2. Search by name and birth date:
   ```
   GET /rest/identitystore/api/search?common_lastname=DUBOIS&first_name=test&birthdate=24/08/1962
   ```

## Security
- The service requires admin authentication
- Access is controlled by RBAC permissions
- Users must have the appropriate permissions on the `IDENTITYPICKER` resource type

## Permissions
The IdentityPicker functionality is controlled by RBAC permissions:
- `SEARCH`: Allows the user to search for identities.
- `VIEW` :  Allows the user to view identity, history and tasks by `customer_id`.
- `CREATE`: Allows the user to create new identity.
- `UPDATE`: Allows the user to update identity by `customer_id`.
- `CREATE_TASK`: Allows the user to create task by `customer_id`.

## Error Handling
The service returns appropriate HTTP status codes and error messages:
- 400 Bad Request: Invalid parameters
- 403 Forbidden: Unauthorized access
- 404 Not Found: No matching identities
- 500 Internal Server Error: Unexpected errors

## IdentityPicker Macro
The IdentityPicker plugin provides a Freemarker macro for easy integration into your templates.

### Including the Macro
```freemarker
<#include "/admin/plugins/identitypicker/identitypicker.ftl" />
```

### Macro Parameters
- `search` (default: true): Enables or disables the search functionality.
- `creation` (default: false): Enables or disables the identity creation functionality.
- `update` (default: false): Enables or disables the identity update functionality.
- `selection` (default: true): Enables or disables the selection functionality.
- `createTask` (default: false): Enables or disables the task functionality.
- `fieldMappings` (default: "{}"): A JSON object mapping form field IDs to identity attributes.
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