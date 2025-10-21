package com.example.monitorcommunicator;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    // Set the custom splash screen layout
    setContentView(R.layout.launch_screen);
    
    super.onCreate(savedInstanceState);
  }
}
