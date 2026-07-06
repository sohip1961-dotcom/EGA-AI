package com.egs.ai.egs_ai

import android.media.MediaRecorder
import android.os.Build
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import java.io.File

class MainActivity : FlutterActivity() {
    private val CHANNEL = "com.egs.ai/recorder"
    private var mediaRecorder: MediaRecorder? = null
    private var outputFilePath: String? = null

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL).setMethodCallHandler { call, result ->
            when (call.method) {
                "startRecording" -> {
                    try {
                        startRecording()
                        result.success(true)
                    } catch (e: Exception) {
                        result.error("RECORD_ERROR", e.message, null)
                    }
                }
                "stopRecording" -> {
                    try {
                        val path = stopRecording()
                        result.success(path)
                    } catch (e: Exception) {
                        result.error("RECORD_ERROR", e.message, null)
                    }
                }
                else -> {
                    result.notImplemented()
                }
            }
        }
    }

    private fun startRecording() {
        val cacheDir = externalCacheDir ?: cacheDir
        val outputFile = File(cacheDir, "temp_record.m4a")
        outputFilePath = outputFile.absolutePath

        // Delete existing file if present
        if (outputFile.exists()) {
            outputFile.delete()
        }

        mediaRecorder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            MediaRecorder(this)
        } else {
            @Suppress("DEPRECATION")
            MediaRecorder()
        }.apply {
            setAudioSource(MediaRecorder.AudioSource.MIC)
            setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
            setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
            setAudioEncodingBitRate(128000)
            setAudioSamplingRate(44100)
            setOutputFile(outputFilePath)
            prepare()
            start()
        }
    }

    private fun stopRecording(): String? {
        mediaRecorder?.apply {
            stop()
            release()
        }
        mediaRecorder = null
        return outputFilePath
    }
}
