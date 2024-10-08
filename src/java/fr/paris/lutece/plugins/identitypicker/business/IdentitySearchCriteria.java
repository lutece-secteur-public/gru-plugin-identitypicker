package fr.paris.lutece.plugins.identitypicker.business;

import javax.ws.rs.QueryParam;

public class IdentitySearchCriteria
{
    @QueryParam( "common_email" )
    private String commonEmail;

    @QueryParam( "common_lastname" )
    private String commonLastName;

    @QueryParam( "first_name" )
    private String firstName;

    @QueryParam( "birthdate" )
    private String birthDate;

    // Constructeur sans argument nécessaire pour Jersey
    public IdentitySearchCriteria( )
    {
    }

    // Constructeur existant
    public IdentitySearchCriteria( String commonEmail, String commonLastName, String firstName, String birthDate )
    {
        this.commonEmail = commonEmail;
        this.commonLastName = commonLastName;
        this.firstName = firstName;
        this.birthDate = birthDate;
    }

    // Méthodes existantes
    public boolean isValid( )
    {
        return hasCommonEmail( ) || ( hasNameAndBirthDate( ) );
    }

    public boolean hasCommonEmail( )
    {
        return commonEmail != null && !commonEmail.isEmpty( );
    }

    private boolean hasNameAndBirthDate( )
    {
        return commonLastName != null && !commonLastName.isEmpty( ) && firstName != null && !firstName.isEmpty( ) && birthDate != null && !birthDate.isEmpty( );
    }

    // Getters et setters
    public String getCommonEmail( )
    {
        return commonEmail;
    }

    public void setCommonEmail( String commonEmail )
    {
        this.commonEmail = commonEmail;
    }

    public String getCommonLastName( )
    {
        return commonLastName;
    }

    public void setCommonLastName( String commonLastName )
    {
        this.commonLastName = commonLastName;
    }

    public String getFirstName( )
    {
        return firstName;
    }

    public void setFirstName( String firstName )
    {
        this.firstName = firstName;
    }

    public String getBirthDate( )
    {
        return birthDate;
    }

    public void setBirthDate( String birthDate )
    {
        this.birthDate = birthDate;
    }
}
