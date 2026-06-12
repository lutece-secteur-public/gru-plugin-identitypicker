/*
 * Copyright (c) 2002-2024, City of Paris
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 *  1. Redistributions of source code must retain the above copyright notice
 *     and the following disclaimer.
 *
 *  2. Redistributions in binary form must reproduce the above copyright notice
 *     and the following disclaimer in the documentation and/or other materials
 *     provided with the distribution.
 *
 *  3. Neither the name of 'Mairie de Paris' nor 'Lutece' nor the names of its
 *     contributors may be used to endorse or promote products derived from
 *     this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDERS OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 *
 * License 1.0
 */
package fr.paris.lutece.plugins.identitypicker.service;

import fr.paris.lutece.plugins.identitystore.v3.web.rs.service.HttpAccessTransport;
import fr.paris.lutece.plugins.identitystore.v3.web.rs.service.HttpApiManagerAccessTransport;
import fr.paris.lutece.plugins.identitystore.v3.web.rs.service.IdentityTransportRest;
import fr.paris.lutece.plugins.identitystore.v3.web.rs.service.ReferentialTransportRest;
import fr.paris.lutece.plugins.identitystore.v3.web.rs.service.ServiceContractTransportRest;
import fr.paris.lutece.plugins.identitystore.v3.web.service.IdentityServiceExtended;
import fr.paris.lutece.plugins.identitystore.v3.web.service.ReferentialService;
import fr.paris.lutece.plugins.identitystore.v3.web.service.ServiceContractServiceExtended;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Produces;
import jakarta.inject.Named;

import org.apache.commons.lang3.StringUtils;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.util.Optional;

/**
 * CDI producer for the Identity Store client services. Replaces the former Spring context
 * ({@code identitypicker_context.xml}) that wired the {@link HttpApiManagerAccessTransport},
 * the REST transports and the identity store services from the plugin properties.
 */
@ApplicationScoped
public class IdentityStoreClientProducer
{
    /**
     * Builds the HTTP transport pointing to the configured Identity Store API endpoint.
     *
     * When an access manager (APIM) endpoint is configured, an {@link HttpApiManagerAccessTransport}
     * is used (OAuth2 token added on each call). Otherwise a plain {@link HttpAccessTransport} is used
     * for direct access (no token) — the relevant mode for an Identity Store reached without an APIM gateway.
     *
     * @param strApiEndPointUrl
     *            the Identity Store API endpoint URL
     * @param strAccessManagerEndPointUrl
     *            the access manager (token) endpoint URL, blank when no APIM is used
     * @param strAccessManagerCredentials
     *            the access manager credentials
     * @return the configured HTTP transport
     */
    private HttpAccessTransport createTransport( String strApiEndPointUrl, String strAccessManagerEndPointUrl,
            String strAccessManagerCredentials )
    {
        if ( StringUtils.isNotBlank( strAccessManagerEndPointUrl ) )
        {
            HttpApiManagerAccessTransport apimTransport = new HttpApiManagerAccessTransport( );
            apimTransport.setApiEndPointUrl( strApiEndPointUrl );
            apimTransport.setAccessManagerEndPointUrl( strAccessManagerEndPointUrl );
            apimTransport.setAccessManagerCredentials( strAccessManagerCredentials );
            return apimTransport;
        }
        HttpAccessTransport transport = new HttpAccessTransport( );
        transport.setApiEndPointUrl( strApiEndPointUrl );
        return transport;
    }

    /**
     * Produces the extended identity service over a REST transport.
     *
     * @param strApiEndPointUrl
     *            the Identity Store API endpoint URL
     * @param strAccessManagerEndPointUrl
     *            the access manager (token) endpoint URL
     * @param strAccessManagerCredentials
     *            the access manager credentials
     * @return the configured IdentityServiceExtended
     */
    @Produces
    @ApplicationScoped
    @Named( "identityService.rest.httpAccess" )
    public IdentityServiceExtended createIdentityService(
            @ConfigProperty( name = "identitypicker.identitystore.apiEndPointUrl" ) String strApiEndPointUrl,
            @ConfigProperty( name = "identitypicker.identitystore.accessManagerEndPointUrl" ) Optional<String> strAccessManagerEndPointUrl,
            @ConfigProperty( name = "identitypicker.identitystore.accessManagerCredentials" ) Optional<String> strAccessManagerCredentials )
    {
        HttpAccessTransport transport = createTransport( strApiEndPointUrl, strAccessManagerEndPointUrl.orElse( "" ),
                strAccessManagerCredentials.orElse( "" ) );
        return new IdentityServiceExtended( new IdentityTransportRest( transport ) );
    }

    /**
     * Produces the referential service over a REST transport.
     *
     * @param strApiEndPointUrl
     *            the Identity Store API endpoint URL
     * @param strAccessManagerEndPointUrl
     *            the access manager (token) endpoint URL
     * @param strAccessManagerCredentials
     *            the access manager credentials
     * @return the configured ReferentialService
     */
    @Produces
    @ApplicationScoped
    @Named( "identity.ReferentialService" )
    public ReferentialService createReferentialService(
            @ConfigProperty( name = "identitypicker.identitystore.apiEndPointUrl" ) String strApiEndPointUrl,
            @ConfigProperty( name = "identitypicker.identitystore.accessManagerEndPointUrl" ) Optional<String> strAccessManagerEndPointUrl,
            @ConfigProperty( name = "identitypicker.identitystore.accessManagerCredentials" ) Optional<String> strAccessManagerCredentials )
    {
        HttpAccessTransport transport = createTransport( strApiEndPointUrl, strAccessManagerEndPointUrl.orElse( "" ),
                strAccessManagerCredentials.orElse( "" ) );
        return new ReferentialService( new ReferentialTransportRest( transport ) );
    }

    /**
     * Produces the extended service contract service over a REST transport.
     *
     * @param strApiEndPointUrl
     *            the Identity Store API endpoint URL
     * @param strAccessManagerEndPointUrl
     *            the access manager (token) endpoint URL
     * @param strAccessManagerCredentials
     *            the access manager credentials
     * @return the configured ServiceContractServiceExtended
     */
    @Produces
    @ApplicationScoped
    @Named( "identity.serviceContractService" )
    public ServiceContractServiceExtended createServiceContractService(
            @ConfigProperty( name = "identitypicker.identitystore.apiEndPointUrl" ) String strApiEndPointUrl,
            @ConfigProperty( name = "identitypicker.identitystore.accessManagerEndPointUrl" ) Optional<String> strAccessManagerEndPointUrl,
            @ConfigProperty( name = "identitypicker.identitystore.accessManagerCredentials" ) Optional<String> strAccessManagerCredentials )
    {
        HttpAccessTransport transport = createTransport( strApiEndPointUrl, strAccessManagerEndPointUrl.orElse( "" ),
                strAccessManagerCredentials.orElse( "" ) );
        return new ServiceContractServiceExtended( new ServiceContractTransportRest( transport ) );
    }
}
