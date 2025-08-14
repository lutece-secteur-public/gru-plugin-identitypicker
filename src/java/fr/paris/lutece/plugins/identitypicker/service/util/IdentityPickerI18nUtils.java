package fr.paris.lutece.plugins.identitypicker.service.util;

import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Properties;
import java.util.ResourceBundle;

import fr.paris.lutece.portal.service.i18n.I18nService;
import fr.paris.lutece.portal.service.util.AppLogService;

/**
 * Utility class for internationalization operations in the Identity Picker plugin
 */
public class IdentityPickerI18nUtils {
    
    private static final String BUNDLE_NAME = "fr.paris.lutece.plugins.identitypicker.resources.identitypicker_messages";
    private static final String KEY_PREFIX = "language.";
    private static final String FULL_KEY_PREFIX = "identitypicker.language.";
    private static final String IDENTITY_STORE_RESOURCE_PATH_PREFIX = "fr/paris/lutece/plugins/identitystore/resources/identitystore_messages_";
    private static final String PROPERTIES_EXTENSION = ".properties";
    private static final String ERROR_GETTING_LOCALIZED_STRING = "Error getting localized string for key: ";
    private static final String ERROR_RESOURCE_NOT_FOUND = "Resource not found: ";
    private static final String ERROR_LOADING_PROPERTIES = "Error loading properties from JAR: ";
    
    /**
     * Retrieves all localized strings for a given locale
     * 
     * @param locale the locale for which to retrieve localized strings
     * @return a map containing localized strings with their keys
     */
    public static Map<String, String> getAllLocalizedStrings(Locale locale) {
        Map<String, String> result = new HashMap<>();
        ResourceBundle bundle = ResourceBundle.getBundle(BUNDLE_NAME, locale);
        
        for (String key : bundle.keySet()) {
            if (key.startsWith(KEY_PREFIX)) {
                processLocalizedKey(key, locale, result);
            }
        }
        
        return result;
    }
    
    /**
     * Processes a single localized key and adds it to the result map
     * 
     * @param key the resource bundle key to process
     * @param locale the locale for localization
     * @param result the map to store the processed key-value pair
     */
    private static void processLocalizedKey(String key, Locale locale, Map<String, String> result) {
        try {
            String fullKey = FULL_KEY_PREFIX + key.substring(KEY_PREFIX.length());
            String value = I18nService.getLocalizedString(fullKey, locale);
            result.put(key.substring(KEY_PREFIX.length()), value);
        } catch (Exception e) {
            AppLogService.error(ERROR_GETTING_LOCALIZED_STRING + key, e);
        }
    }
    
    /**
     * Loads identity store properties for a specific locale
     * 
     * @param locale the locale string for which to load properties
     * @return a map containing the loaded properties
     */
    public static Map<String, String> loadIdentityStoreProperties(String locale) {
        Map<String, String> result = new HashMap<>();
        String resourcePath = IDENTITY_STORE_RESOURCE_PATH_PREFIX + locale + PROPERTIES_EXTENSION;
        ClassLoader classLoader = getClassLoader();
        
        try (InputStream inputStream = classLoader.getResourceAsStream(resourcePath)) {
            if (inputStream != null) {
                loadPropertiesFromStream(inputStream, result);
            } else {
                AppLogService.error(ERROR_RESOURCE_NOT_FOUND + resourcePath);
            }
        } catch (IOException e) {
            AppLogService.error(ERROR_LOADING_PROPERTIES + resourcePath, e);
        }
        
        return result;
    }
    
    /**
     * Gets the appropriate class loader
     * 
     * @return the class loader to use for resource loading
     */
    private static ClassLoader getClassLoader() {
        ClassLoader classLoader = Thread.currentThread().getContextClassLoader();
        if (classLoader == null) {
            classLoader = IdentityPickerI18nUtils.class.getClassLoader();
        }
        return classLoader;
    }
    
    /**
     * Loads properties from an input stream into a result map
     * 
     * @param inputStream the input stream containing properties
     * @param result the map to store the loaded properties
     * @throws IOException if an error occurs while reading the stream
     */
    private static void loadPropertiesFromStream(InputStream inputStream, Map<String, String> result) 
            throws IOException {
        Properties properties = new Properties();
        properties.load(inputStream);
        
        for (String key : properties.stringPropertyNames()) {
            result.put(key, properties.getProperty(key));
        }
    }
}