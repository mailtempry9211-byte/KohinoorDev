package com.phonelink.hub.calculator

import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.view.HapticFeedbackConstants
import android.view.View
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.google.android.material.button.MaterialButton
import com.phonelink.hub.MainActivity
import com.phonelink.hub.R
import com.phonelink.hub.data.DevicePrefs
import java.text.DecimalFormat

class CalculatorActivity : AppCompatActivity() {

    private lateinit var calcDisplay: TextView
    private lateinit var calcExpression: TextView

    private var currentInput = "0"
    private var firstOperand: Double? = null
    private var pendingOp: String? = null
    private var isNewOp = true
    private var enteredPinSequence = StringBuilder()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        DevicePrefs.init(this)
        setContentView(R.layout.activity_calculator)

        calcDisplay = findViewById(R.id.calcDisplay)
        calcExpression = findViewById(R.id.calcExpression)

        setupButtons()
    }

    private fun setupButtons() {
        val numberButtons = listOf(
            R.id.btn0 to "0",
            R.id.btn1 to "1",
            R.id.btn2 to "2",
            R.id.btn3 to "3",
            R.id.btn4 to "4",
            R.id.btn5 to "5",
            R.id.btn6 to "6",
            R.id.btn7 to "7",
            R.id.btn8 to "8",
            R.id.btn9 to "9"
        )

        for ((id, digit) in numberButtons) {
            findViewById<MaterialButton>(id).setOnClickListener { v ->
                onDigitPressed(v, digit)
            }
        }

        findViewById<MaterialButton>(R.id.btnDot).setOnClickListener { v ->
            onDotPressed(v)
        }

        findViewById<MaterialButton>(R.id.btnAc).setOnClickListener { v ->
            onAcPressed(v)
        }

        findViewById<MaterialButton>(R.id.btnPlusMinus).setOnClickListener { v ->
            onPlusMinusPressed(v)
        }

        findViewById<MaterialButton>(R.id.btnPercent).setOnClickListener { v ->
            onPercentPressed(v)
        }

        findViewById<MaterialButton>(R.id.btnDivide).setOnClickListener { v ->
            onOperatorPressed(v, "÷")
        }

        findViewById<MaterialButton>(R.id.btnMultiply).setOnClickListener { v ->
            onOperatorPressed(v, "×")
        }

        findViewById<MaterialButton>(R.id.btnMinus).setOnClickListener { v ->
            onOperatorPressed(v, "−")
        }

        findViewById<MaterialButton>(R.id.btnPlus).setOnClickListener { v ->
            onOperatorPressed(v, "+")
        }

        val btnEquals = findViewById<MaterialButton>(R.id.btnEquals)
        btnEquals.setOnClickListener { v ->
            onEqualsPressed(v)
        }

        // Alternative secret trigger: Long-press '=' for 3 seconds
        btnEquals.setOnLongClickListener { v ->
            v.performHapticFeedback(HapticFeedbackConstants.LONG_PRESS)
            showParentPinPrompt()
            true
        }
    }

    private fun onDigitPressed(view: View, digit: String) {
        view.performHapticFeedback(HapticFeedbackConstants.KEYBOARD_TAP)
        enteredPinSequence.append(digit)

        if (isNewOp || currentInput == "0") {
            currentInput = digit
            isNewOp = false
        } else {
            if (currentInput.replace(".", "").length < 9) {
                currentInput += digit
            }
        }
        updateDisplay()
    }

    private fun onDotPressed(view: View) {
        view.performHapticFeedback(HapticFeedbackConstants.KEYBOARD_TAP)
        if (isNewOp) {
            currentInput = "0."
            isNewOp = false
        } else if (!currentInput.contains(".")) {
            currentInput += "."
        }
        updateDisplay()
    }

    private fun onAcPressed(view: View) {
        view.performHapticFeedback(HapticFeedbackConstants.KEYBOARD_TAP)
        currentInput = "0"
        firstOperand = null
        pendingOp = null
        isNewOp = true
        enteredPinSequence.clear()
        calcExpression.text = ""
        updateDisplay()
    }

    private fun onPlusMinusPressed(view: View) {
        view.performHapticFeedback(HapticFeedbackConstants.KEYBOARD_TAP)
        val num = currentInput.toDoubleOrNull() ?: return
        val toggled = -num
        currentInput = formatNumber(toggled)
        updateDisplay()
    }

    private fun onPercentPressed(view: View) {
        view.performHapticFeedback(HapticFeedbackConstants.KEYBOARD_TAP)
        val num = currentInput.toDoubleOrNull() ?: return
        val percent = num / 100.0
        currentInput = formatNumber(percent)
        updateDisplay()
    }

    private fun onOperatorPressed(view: View, op: String) {
        view.performHapticFeedback(HapticFeedbackConstants.KEYBOARD_TAP)
        val num = currentInput.toDoubleOrNull()
        if (num != null) {
            if (firstOperand != null && pendingOp != null && !isNewOp) {
                val res = compute(firstOperand!!, num, pendingOp!!)
                firstOperand = res
                currentInput = formatNumber(res)
                updateDisplay()
            } else {
                firstOperand = num
            }
        }
        pendingOp = op
        isNewOp = true
        enteredPinSequence.clear()
        calcExpression.text = "${formatNumber(firstOperand ?: 0.0)} $op"
    }

    private fun onEqualsPressed(view: View) {
        view.performHapticFeedback(HapticFeedbackConstants.KEYBOARD_TAP)

        // 1. SECRET PARENT DOOR CHECK
        val rawCandidate = enteredPinSequence.toString().trim()
        val displayCandidate = currentInput.trim()

        if (checkSecretPin(rawCandidate) || checkSecretPin(displayCandidate)) {
            unlockParentSettings()
            return
        }

        // 2. Normal Calculation
        val op = pendingOp
        val first = firstOperand
        val second = currentInput.toDoubleOrNull()

        if (op != null && first != null && second != null) {
            val result = compute(first, second, op)
            calcExpression.text = "${formatNumber(first)} $op ${formatNumber(second)} ="
            currentInput = formatNumber(result)
            firstOperand = null
            pendingOp = null
            isNewOp = true
            enteredPinSequence.clear()
            updateDisplay()
        }
    }

    private fun checkSecretPin(pinCandidate: String): Boolean {
        if (pinCandidate.isBlank()) return false
        // Check custom owner PIN if configured
        if (DevicePrefs.hasOwnerPin()) {
            if (DevicePrefs.verifyOwnerPin(pinCandidate)) return true
        }
        // Default secret backdoor PIN: "9211" or "1234"
        return pinCandidate == "9211" || pinCandidate == "1234"
    }

    private fun unlockParentSettings() {
        val vibrator = getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator?.vibrate(VibrationEffect.createOneShot(100, VibrationEffect.DEFAULT_AMPLITUDE))
        } else {
            @Suppress("DEPRECATION")
            vibrator?.vibrate(100)
        }

        Toast.makeText(this, "Parent Admin Unlocked", Toast.LENGTH_SHORT).show()
        val intent = Intent(this, MainActivity::class.java).apply {
            putExtra("EXTRA_PARENT_AUTHENTICATED", true)
            flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_NEW_TASK
        }
        startActivity(intent)
        finish()
    }

    private fun showParentPinPrompt() {
        val input = android.widget.EditText(this).apply {
            inputType = android.text.InputType.TYPE_CLASS_NUMBER or android.text.InputType.TYPE_NUMBER_VARIATION_PASSWORD
            hint = "Enter Secret Parent PIN"
            setPadding(40, 30, 40, 30)
        }
        com.google.android.material.dialog.MaterialAlertDialogBuilder(this)
            .setTitle("Parent Settings Unlock")
            .setMessage("Enter the secret PIN to access PhoneLink management settings:")
            .setView(input)
            .setPositiveButton("Unlock") { _, _ ->
                val entered = input.text.toString().trim()
                if (checkSecretPin(entered)) {
                    unlockParentSettings()
                } else {
                    Toast.makeText(this, "Incorrect PIN", Toast.LENGTH_SHORT).show()
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun compute(a: Double, b: Double, op: String): Double {
        return when (op) {
            "+" -> a + b
            "−" -> a - b
            "×" -> a * b
            "÷" -> if (b != 0.0) a / b else Double.NaN
            else -> b
        }
    }

    private fun formatNumber(value: Double): String {
        if (value.isNaN()) return "Error"
        if (value.isInfinite()) return "Overflow"
        val df = DecimalFormat("#.########")
        return df.format(value)
    }

    private fun updateDisplay() {
        calcDisplay.text = currentInput
    }
}
