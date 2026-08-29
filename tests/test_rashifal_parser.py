import importlib.util
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / 'scripts' / 'fetch_rashifal.py'
FIXTURE = ROOT / 'tests' / 'fixtures' / 'rashifal_daily.html'

spec = importlib.util.spec_from_file_location('fetch_rashifal', SCRIPT)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


class RashifalParserTests(unittest.TestCase):
    def setUp(self):
        from bs4 import BeautifulSoup
        self.soup = BeautifulSoup(FIXTURE.read_text(encoding='utf-8'), 'html.parser')

    def test_all_twelve_signs_are_extractable(self):
        for slug, nepali, english in mod.SIGNS:
            prediction = mod.extract_nepalipatro(self.soup, nepali, english)
            self.assertGreaterEqual(len(prediction), 40, english)
            self.assertNotIn(english, prediction)

    def test_heading_variants_are_supported(self):
        self.assertTrue(mod.looks_like_heading('मेष-Aries', 'मेष', 'Aries'))
        self.assertTrue(mod.looks_like_heading('मेष - Aries', 'मेष', 'Aries'))
        self.assertTrue(mod.looks_like_heading('मेष–Aries', 'मेष', 'Aries'))
        self.assertTrue(mod.looks_like_heading('मेष:Aries', 'मेष', 'Aries'))

    def test_prediction_is_not_heading_text(self):
        text = mod.clean_prediction('मेष-Aries आजको दिन राम्रो रहनेछ र महत्वपूर्ण काममा सफलता मिल्नेछ।', 'मेष', 'Aries')
        self.assertNotIn('Aries', text)
        self.assertNotIn('मेष', text)

    def test_wrong_or_missing_sign_fails(self):
        with self.assertRaises(RuntimeError):
            mod.extract_nepalipatro(self.soup, 'काल्पनिक', 'Imaginary')

    def test_archive_schema(self):
        archive = ROOT / 'data' / 'rashifal' / '2026-08-28.json'
        if not archive.exists():
            self.skipTest('existing archive not present')
        data = json.loads(archive.read_text(encoding='utf-8'))
        self.assertEqual(len(data.get('signs', [])), 12)
        self.assertEqual(len({s.get('id') for s in data['signs']}), 12)


if __name__ == '__main__':
    unittest.main()
