This repository contains three scripts that enable the conversion of old video codecs to supported browser formats. The motivation behind writing these scripts is that most old video codecs are no longer supported by recent browsers or video players. Even legacy browsers or players that used flash players are now deprecated. Additionally, some iPhone video codecs are not supported, and we cannot always expect users to convert videos themselves.

The three scripts in this repo serve the following purposes:

  - analyze_objects: This script analyzes all objects in the bucket and dumps the keys of objects that need converting to supported browser formats.
  - backup_objects: This script takes a backup of all video keys dumped in the backup bucket. If you're using versioning in your bucket, you can skip this step.
  - convert_video: This script converts the video one by one and uploads it to the same key.

The primary functionality of these scripts is to automate the video conversion process using FFMPEG within a node environment. By doing so, you can easily convert your old video codecs to supported browser formats without the need for manual conversion.