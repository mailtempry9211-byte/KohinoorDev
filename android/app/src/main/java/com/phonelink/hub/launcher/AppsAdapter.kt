package com.phonelink.hub.launcher

import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.provider.Settings
import android.util.TypedValue
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.recyclerview.widget.RecyclerView
import com.phonelink.hub.R

class AppsAdapter(
    private val context: Context,
    private var appsList: List<AppItem>,
    private var iconSizeDp: Int = 54,
    private var isDarkTheme: Boolean = true
) : RecyclerView.Adapter<AppsAdapter.AppViewHolder>() {

    fun updateApps(newApps: List<AppItem>) {
        appsList = newApps
        notifyDataSetChanged()
    }

    fun setIconSize(dp: Int) {
        if (iconSizeDp != dp) {
            iconSizeDp = dp
            notifyDataSetChanged()
        }
    }

    fun setTheme(dark: Boolean) {
        if (isDarkTheme != dark) {
            isDarkTheme = dark
            notifyDataSetChanged()
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): AppViewHolder {
        val view = LayoutInflater.from(context).inflate(R.layout.item_launcher_app, parent, false)
        return AppViewHolder(view)
    }

    override fun onBindViewHolder(holder: AppViewHolder, position: Int) {
        val app = appsList[position]
        holder.label.text = app.label
        holder.icon.setImageDrawable(app.icon)

        // Apply dynamic icon size
        val sizePx = TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP,
            iconSizeDp.toFloat(),
            context.resources.displayMetrics
        ).toInt()

        val params = holder.icon.layoutParams
        if (params.width != sizePx || params.height != sizePx) {
            params.width = sizePx
            params.height = sizePx
            holder.icon.layoutParams = params
        }

        // Apply theme text color
        holder.label.setTextColor(if (isDarkTheme) Color.WHITE else Color.parseColor("#1E293B"))

        // Launch app on tap
        holder.itemView.setOnClickListener {
            try {
                val launchIntent = context.packageManager.getLaunchIntentForPackage(app.packageName)
                if (launchIntent != null) {
                    launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED)
                    context.startActivity(launchIntent)
                } else {
                    Toast.makeText(context, "Cannot open ${app.label}", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                Toast.makeText(context, "Error launching app: ${e.message}", Toast.LENGTH_SHORT).show()
            }
        }

        // Long click menu for app info or uninstall
        holder.itemView.setOnLongClickListener {
            showAppOptionsDialog(app)
            true
        }
    }

    private fun showAppOptionsDialog(app: AppItem) {
        val options = arrayOf("Open App", "App Info", "Uninstall")
        AlertDialog.Builder(context, R.style.Theme_PhoneLinkHub)
            .setTitle(app.label)
            .setItems(options) { dialog, which ->
                when (which) {
                    0 -> {
                        val launchIntent = context.packageManager.getLaunchIntentForPackage(app.packageName)
                        if (launchIntent != null) {
                            launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                            context.startActivity(launchIntent)
                        }
                    }
                    1 -> {
                        try {
                            val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                                data = Uri.parse("package:${app.packageName}")
                                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                            }
                            context.startActivity(intent)
                        } catch (e: Exception) {
                            Toast.makeText(context, "Cannot open App Info", Toast.LENGTH_SHORT).show()
                        }
                    }
                    2 -> {
                        try {
                            val intent = Intent(Intent.ACTION_DELETE).apply {
                                data = Uri.parse("package:${app.packageName}")
                                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                            }
                            context.startActivity(intent)
                        } catch (e: Exception) {
                            Toast.makeText(context, "Cannot uninstall", Toast.LENGTH_SHORT).show()
                        }
                    }
                }
                dialog.dismiss()
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    override fun getItemCount(): Int = appsList.size

    class AppViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val icon: ImageView = view.findViewById(R.id.appIcon)
        val label: TextView = view.findViewById(R.id.appLabel)
    }
}
