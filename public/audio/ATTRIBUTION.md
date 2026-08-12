# Audio sources, transformations, and licenses

Both packaged instruments may be used commercially under **Creative Commons Attribution 3.0 Unported (CC BY 3.0)**. Redistribution requires attribution; neither source is copyright-free or public-domain material.

## Salamander Grand Piano V3

- Instrument and recording: Alexander Holm, Yamaha C5 grand piano.
- Official source: https://github.com/sfzinstruments/SalamanderGrandPiano
- Source revision: `3382bf9496bba2486f5ab0de55a264d1dfc38404`
- License: https://creativecommons.org/licenses/by/3.0/
- Source format: 48 kHz / 24-bit FLAC, velocity layer 10 (`lovel=73`, `hivel=80`).
- Selected source anchors: `A3v10.flac`, `C4v10.flac`, `D#4v10.flac`, `F#4v10.flac`, `A4v10.flac`, `C5v10.flac`, `D#5v10.flac`, `F#5v10.flac`.
- Transformation: trim below −60 dBFS with 10 ms pre-roll and 120 ms tail; cap at 6 seconds; normalize peak to −3 dBFS; apply 6 ms fade-in and 80 ms fade-out; encode stereo MP3 at 48 kHz / 192 kbps with LAME quality 2.
- Runtime treatment: −7.5 dB sampler gain, EQ (`low −1.5 dB`, `mid −0.8 dB`, `high +1.6 dB`), 0.9 s release.

Packaged files (`SHA-256`):

- `piano-v10/A3.mp3` — `3AD7407E6E661211F7FFE4B3EB21ED9CB78455FECC2B998D49BEDB960FAD32F1`
- `piano-v10/C4.mp3` — `BDD6A661D821D0ECA40545050E0FB8A8434E75E6204E7A9E3A6F5DA6DD9194A5`
- `piano-v10/Ds4.mp3` — `72AAB5AB0D1C1CE5C0858B7F8A11FDE94A39D1949C1C81C03311860B1095A44E`
- `piano-v10/Fs4.mp3` — `D021A68E05558CE249BA24493C357F43EE72E25398CFA721D1BB27B565E2E3BE`
- `piano-v10/A4.mp3` — `698ED1D966282E500B6CEEFF568252260A992ACCDC2534097D79F4FC0382DCAB`
- `piano-v10/C5.mp3` — `9051E90F373177C416D89E1A9ADADF1DC10CEF9612AAF95323887EAAC1380643`
- `piano-v10/Ds5.mp3` — `E4B95917ABCDCB136123F9E094CD39AE43B43BFFDA52F4C7CDC9EDB21470C41F`
- `piano-v10/Fs5.mp3` — `A80CE84361DFAB1BA6EC5540F8D87D4F05A010993D858FDB4AC354C00CE4BAAA`

## Quartertone Yamaha Classical Guitar

- Original recording: Freesound user **Quartertone**, `11573__quartertone__classicalguitar-multisampled` (Yamaha classical guitar).
- Edited sample set: Tone.js Instruments by nbrosowsky.
- Official source: https://github.com/nbrosowsky/tonejs-instruments
- Source revision: `622c2f1c32c8cfce4158ddc3eb26e518ddef37e5`
- License: https://creativecommons.org/licenses/by/3.0/
- Upstream editing: silence trimming, ramps, volume matching, normalization, noise removal, and pitch correction where needed.
- Packaged transformation: no additional audio conversion; selected upstream MP3 anchors are copied and renamed only where `#` becomes `s` in filenames. The upstream file previously mapped as `D5` was excluded after frequency analysis showed that it sounds approximately one semitone sharp; Tone.js interpolates D5 from the remaining in-tune anchors.
- Runtime treatment: −4.5 dB sampler gain, EQ (`low +0.8 dB`, `mid +0.3 dB`, `high −4.2 dB`), 1.05 s release; harmonic voicings use a 30 ms low-to-high strum. The gain offset compensates for the guitar set's lower median first-1.5-second RMS while the high-band cut reduces metallic brightness.

Packaged files (`SHA-256`):

- `guitar-quartertone-v1/A3.mp3` — `A4B25E648CE07F79ECB0C00F8A788ADD2A77E19163CD656CA48E10713854A5EA`
- `guitar-quartertone-v1/A4.mp3` — `3436E55CF99281A40467DCE558EA3009B929080D837193492FB110B7AFD348E7`
- `guitar-quartertone-v1/B3.mp3` — `9E4B3DF9CDA03761DC093B910000BFC68083D9CE40605FDD2AF370140521F2CD`
- `guitar-quartertone-v1/B4.mp3` — `74CBAC2107E258FF27198E87081A76677CA8820E0B257DB004EB979429F47469`
- `guitar-quartertone-v1/Cs4.mp3` — `A4CC76204D938EDB2190D70A16D916BDBC1DB12EC751FE9B5F1EDB38DD0E0527`
- `guitar-quartertone-v1/Cs5.mp3` — `A8C85D0EA7188ED1F7794A7CE96C462824F89F5B2F153052F9B9C438E4C2B2E5`
- `guitar-quartertone-v1/Ds4.mp3` — `05CBEAF46E110136346E855EB3A94D2DB6756E5903B74DE2E78ECA58C8A6E77B`
- `guitar-quartertone-v1/E4.mp3` — `3F95D206021F8935D79DA1F1B5BFFE45C17F8DBFB598148E6A3AC4999CB0FA0B`
- `guitar-quartertone-v1/E5.mp3` — `9AB5B711D43F7BD0CF5A7EC2C5D5A382C701B0258341A0A4483CCB377C4FD63C`
- `guitar-quartertone-v1/Fs4.mp3` — `33A2F0B2CCEE800CAE58BFDBBD2680FDABD866548EFBB9E2696A5462A0E433C5`
- `guitar-quartertone-v1/G3.mp3` — `85CBC7AEB84956C5B30333D73FEDB57F1C393D04302684566CA77523015A6449`
- `guitar-quartertone-v1/Gs4.mp3` — `3310492ADEF184214D85D87E4D30ACE28C6F5274A5883FB85DB4BB730135DD4C`

## Bravura notation font

Non-staff accidentals and chord symbols use **Bravura Text** by Steinberg Media Technologies GmbH.

- Official source: https://github.com/steinbergmedia/bravura
- Source revision: `632e925353aab2ac0a81c97a4662d315a82b56f4`
- License: SIL Open Font License 1.1; the complete license is packaged at `../fonts/OFL.txt`.
- Packaged file: `../fonts/BravuraText.woff2`
- SHA-256: `DD3988D74DF701F941A0EC61E1BD1385DAD8B80F3C1E78401EC00A9BE3E519BA`
