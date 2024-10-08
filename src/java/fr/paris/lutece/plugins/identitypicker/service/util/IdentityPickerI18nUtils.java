package fr.paris.lutece.plugins.identitypicker.service.util;

import fr.paris.lutece.portal.service.i18n.I18nService;
import fr.paris.lutece.portal.service.util.AppLogService;

import java.util.*;

public class IdentityPickerI18nUtils {

    private static final String BUNDLE_NAME = "fr.paris.lutece.plugins.identitypicker.resources.identitypicker_messages";
    private static final String KEY_PREFIX = "language.";
    private static final String FULL_KEY_PREFIX = "identitypicker.language.";

    /**
     * Get all localized strings for the given locale
     *
     * @param locale the locale
     * @return a map of localized strings
     */

    public static Map<String, Object> getAllLocalizedStrings(Locale locale) {
        Map<String, Object> result = new HashMap<>();
        ResourceBundle bundle = ResourceBundle.getBundle(BUNDLE_NAME, locale);

        for (String key : bundle.keySet()) {
            if (key.startsWith(KEY_PREFIX)) {
                try {
                    String fullKey = FULL_KEY_PREFIX + key.substring(KEY_PREFIX.length());
                    String value = I18nService.getLocalizedString(fullKey, locale);
                    addNestedKey(result, key.substring(KEY_PREFIX.length()).split("\\."), value);
                } catch (Exception e) {
                    AppLogService.error("Error getting localized string for key: " + key, e);
                }
            }
        }

        return result;
    }

    /**
     * Add a nested key to a map
     *
     * @param map the map
     * @param parts the parts of the key
     * @param value the value
     */
    @SuppressWarnings("unchecked")
    private static void addNestedKey(Map<String, Object> map, String[] parts, String value) {
        Map<String, Object> current = map;
        for (int i = 0; i < parts.length - 1; i++) {
            current = (Map<String, Object>) current.computeIfAbsent(parts[i], k -> new HashMap<String, Object>());
        }
        current.put(parts[parts.length - 1], value);
    }
}