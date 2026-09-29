"""Adds the Share-to-Link-Vault intent filter and native bridge to the generated android/ project."""
import pathlib, shutil

root = pathlib.Path('android/app/src/main')
manifest = root / 'AndroidManifest.xml'
t = manifest.read_text()
if 'android.intent.action.SEND' not in t:
    f = ('<intent-filter>\n<action android:name="android.intent.action.SEND" />\n'
         '<category android:name="android.intent.category.DEFAULT" />\n'
         '<data android:mimeType="text/plain" />\n</intent-filter>\n')
    t = t.replace('</activity>', f + '</activity>', 1)
if 'launchMode' not in t:
    t = t.replace('<activity', '<activity android:launchMode="singleTask"', 1)
manifest.write_text(t)
dst = root / 'java/com/tabeer/linkvault'
dst.mkdir(parents=True, exist_ok=True)
for n in ('MainActivity.java', 'ShareIntentPlugin.java'):
    shutil.copy('native/' + n, dst / n)
print('android patched')
