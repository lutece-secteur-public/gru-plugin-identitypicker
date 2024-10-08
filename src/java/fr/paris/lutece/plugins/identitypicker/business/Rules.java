package fr.paris.lutece.plugins.identitypicker.business;

import java.util.Map;

import fr.paris.lutece.plugins.identitystore.v3.web.rs.dto.contract.ServiceContractDto;

public class Rules
{
    Referential referential;
    ServiceContractDto contract;
    Map<String, Object> language;


    public Rules( Referential referential, ServiceContractDto contract, Map<String, Object> language )
    {
        this.referential = referential;
        this.contract = contract;
        this.language = language;
    }

    public Referential getReferential( )
    {
        return referential;
    }

    public ServiceContractDto getContract( )
    {
        return contract;
    }

    public Map<String, Object> getLanguage( )
    {
        return language;
    }

}
