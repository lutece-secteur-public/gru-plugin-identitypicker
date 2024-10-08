package fr.paris.lutece.plugins.identitypicker.business;

import fr.paris.lutece.plugins.identitystore.v3.web.rs.dto.referentiel.AttributeSearchResponse;
import fr.paris.lutece.plugins.identitystore.v3.web.rs.dto.referentiel.LevelSearchResponse;
import fr.paris.lutece.plugins.identitystore.v3.web.rs.dto.referentiel.ProcessusSearchResponse;

public class Referential
{
    private final ProcessusSearchResponse processList;
    private final LevelSearchResponse levelList;
    private final AttributeSearchResponse attributeKeyList;

    public Referential( ProcessusSearchResponse processList, LevelSearchResponse levelList, AttributeSearchResponse attributeKeyList )
    {
        this.processList = processList;
        this.levelList = levelList;
        this.attributeKeyList = attributeKeyList;
    }

    public ProcessusSearchResponse getProcessList( )
    {
        return processList;
    }

    public LevelSearchResponse getLevelList( )
    {
        return levelList;
    }

    public AttributeSearchResponse getAttributeKeyList( )
    {
        return attributeKeyList;
    }
}
