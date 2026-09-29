package com.tabeer.linkvault;

import android.content.Intent;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "ShareIntent")
public class ShareIntentPlugin extends Plugin {
  private String pending;

  private String read(Intent i) {
    if (i != null && Intent.ACTION_SEND.equals(i.getAction()) && "text/plain".equals(i.getType())) {
      String t = i.getStringExtra(Intent.EXTRA_TEXT);
      i.setAction(Intent.ACTION_MAIN); // consume so it is not re-read
      return t;
    }
    return null;
  }

  @Override
  public void load() { pending = read(getActivity().getIntent()); }

  @Override
  protected void handleOnNewIntent(Intent intent) {
    String t = read(intent);
    if (t != null) {
      pending = t;
      JSObject o = new JSObject();
      o.put("text", t);
      notifyListeners("shared", o, true);
    }
  }

  @PluginMethod
  public void getShared(PluginCall call) {
    JSObject o = new JSObject();
    o.put("text", pending);
    pending = null;
    call.resolve(o);
  }
}
