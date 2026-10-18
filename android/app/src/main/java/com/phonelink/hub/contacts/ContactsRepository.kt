package com.phonelink.hub.contacts

import android.Manifest
import android.content.ContentProviderOperation
import android.content.Context
import android.content.pm.PackageManager
import android.provider.ContactsContract
import androidx.core.content.ContextCompat
import org.json.JSONArray
import org.json.JSONObject

/** FEATURE A: reads contacts + inserts new ones. Mirrors CallLogRepository style. */
object ContactsRepository {

    fun hasReadPermission(context: Context): Boolean =
        ContextCompat.checkSelfPermission(context, Manifest.permission.READ_CONTACTS) ==
            PackageManager.PERMISSION_GRANTED

    fun hasWritePermission(context: Context): Boolean =
        ContextCompat.checkSelfPermission(context, Manifest.permission.WRITE_CONTACTS) ==
            PackageManager.PERMISSION_GRANTED

    /** Up to [limit] contacts as { id, name, numbers, photoAvailable }. No photos loaded. */
    fun readAll(context: Context, limit: Int = 1000): List<JSONObject> {
        if (!hasReadPermission(context)) return emptyList()
        val results = mutableListOf<JSONObject>()
        val projection = arrayOf(
            ContactsContract.Contacts._ID,
            ContactsContract.Contacts.DISPLAY_NAME_PRIMARY,
            ContactsContract.Contacts.HAS_PHONE_NUMBER,
            ContactsContract.Contacts.PHOTO_ID
        )
        try {
            context.contentResolver.query(
                ContactsContract.Contacts.CONTENT_URI,
                projection, null, null,
                "${ContactsContract.Contacts.DISPLAY_NAME_PRIMARY} ASC"
            )?.use { cursor ->
                val idIdx = cursor.getColumnIndex(ContactsContract.Contacts._ID)
                val nameIdx = cursor.getColumnIndex(ContactsContract.Contacts.DISPLAY_NAME_PRIMARY)
                val hasPhoneIdx = cursor.getColumnIndex(ContactsContract.Contacts.HAS_PHONE_NUMBER)
                val photoIdx = cursor.getColumnIndex(ContactsContract.Contacts.PHOTO_ID)
                while (cursor.moveToNext() && results.size < limit) {
                    if (idIdx < 0) continue
                    val id = cursor.getString(idIdx) ?: continue
                    val name = if (nameIdx >= 0) cursor.getString(nameIdx) ?: "" else ""
                    if (hasPhoneIdx >= 0 && cursor.getInt(hasPhoneIdx) <= 0) continue
                    val photoAvailable = photoIdx >= 0 && !cursor.isNull(photoIdx)
                    val numbers = readNumbers(context, id)
                    if (numbers.isEmpty()) continue
                    results += JSONObject().apply {
                        put("id", "contact-$id")
                        put("name", name)
                        put("numbers", JSONArray().apply { numbers.forEach { put(it) } })
                        put("photoAvailable", photoAvailable)
                    }
                }
            }
        } catch (e: Exception) {
            android.util.Log.w("ContactsRepository", "readAll error: ${e.message}")
            return results
        }
        return results
    }

    private fun readNumbers(context: Context, contactId: String): List<String> {
        val numbers = mutableListOf<String>()
        try {
            context.contentResolver.query(
                ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
                arrayOf(ContactsContract.CommonDataKinds.Phone.NUMBER),
                "${ContactsContract.CommonDataKinds.Phone.CONTACT_ID} = ?",
                arrayOf(contactId), null
            )?.use { cursor ->
                val idx = cursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.NUMBER)
                while (cursor.moveToNext()) {
                    val n = if (idx >= 0) cursor.getString(idx)?.trim().orEmpty() else ""
                    if (n.isNotBlank() && !numbers.contains(n)) numbers += n
                }
            }
        } catch (_: SecurityException) {
        }
        return numbers
    }

    /** Inserts raw contact + name + phone in one batch. False if no permission/fail. */
    fun addContact(context: Context, name: String, number: String): Boolean {
        if (name.isBlank() || number.isBlank()) return false
        if (!hasWritePermission(context)) return false
        return try {
            val ops = arrayListOf<ContentProviderOperation>()
            ops += ContentProviderOperation.newInsert(ContactsContract.RawContacts.CONTENT_URI)
                .withValue(ContactsContract.RawContacts.ACCOUNT_TYPE, null)
                .withValue(ContactsContract.RawContacts.ACCOUNT_NAME, null)
                .build()
            ops += ContentProviderOperation.newInsert(ContactsContract.Data.CONTENT_URI)
                .withValueBackReference(ContactsContract.Data.RAW_CONTACT_ID, 0)
                .withValue(ContactsContract.Data.MIMETYPE,
                    ContactsContract.CommonDataKinds.StructuredName.CONTENT_ITEM_TYPE)
                .withValue(ContactsContract.CommonDataKinds.StructuredName.DISPLAY_NAME, name.trim())
                .build()
            ops += ContentProviderOperation.newInsert(ContactsContract.Data.CONTENT_URI)
                .withValueBackReference(ContactsContract.Data.RAW_CONTACT_ID, 0)
                .withValue(ContactsContract.Data.MIMETYPE,
                    ContactsContract.CommonDataKinds.Phone.CONTENT_ITEM_TYPE)
                .withValue(ContactsContract.CommonDataKinds.Phone.NUMBER, number.trim())
                .withValue(ContactsContract.CommonDataKinds.Phone.TYPE,
                    ContactsContract.CommonDataKinds.Phone.TYPE_MOBILE)
                .build()
            context.contentResolver.applyBatch(ContactsContract.AUTHORITY, ops)
            true
        } catch (_: Exception) {
            false
        }
    }

    /** Deletes contact by ID. False if no permission or fail. */
    fun deleteContact(context: Context, contactId: String): Boolean {
        if (!hasWritePermission(context) || contactId.isBlank()) return false
        val id = contactId.removePrefix("contact-").trim()
        return try {
            val uri = android.net.Uri.withAppendedPath(ContactsContract.Contacts.CONTENT_URI, id)
            val deleted = context.contentResolver.delete(uri, null, null)
            deleted > 0
        } catch (_: Exception) {
            false
        }
    }

    /** Updates name and phone number for contact ID. False if fail. */
    fun editContact(context: Context, contactId: String, newName: String, newNumber: String): Boolean {
        if (!hasWritePermission(context) || contactId.isBlank()) return false
        val id = contactId.removePrefix("contact-").trim()
        return try {
            val ops = arrayListOf<ContentProviderOperation>()
            if (newName.isNotBlank()) {
                ops += ContentProviderOperation.newUpdate(ContactsContract.Data.CONTENT_URI)
                    .withSelection(
                        "${ContactsContract.Data.CONTACT_ID} = ? AND ${ContactsContract.Data.MIMETYPE} = ?",
                        arrayOf(id, ContactsContract.CommonDataKinds.StructuredName.CONTENT_ITEM_TYPE)
                    )
                    .withValue(ContactsContract.CommonDataKinds.StructuredName.DISPLAY_NAME, newName.trim())
                    .build()
            }
            if (newNumber.isNotBlank()) {
                ops += ContentProviderOperation.newUpdate(ContactsContract.Data.CONTENT_URI)
                    .withSelection(
                        "${ContactsContract.Data.CONTACT_ID} = ? AND ${ContactsContract.Data.MIMETYPE} = ?",
                        arrayOf(id, ContactsContract.CommonDataKinds.Phone.CONTENT_ITEM_TYPE)
                    )
                    .withValue(ContactsContract.CommonDataKinds.Phone.NUMBER, newNumber.trim())
                    .build()
            }
            if (ops.isNotEmpty()) {
                context.contentResolver.applyBatch(ContactsContract.AUTHORITY, ops)
                true
            } else false
        } catch (_: Exception) {
            false
        }
    }
}
