import xml.etree.ElementTree as ET

tree = ET.parse('test_result.xml')
with open('test_summary.txt', 'w', encoding='utf-8') as f:
    for elem in tree.iter('testcase'):
        fails = elem.findall('failure') + elem.findall('error')
        for fail in fails:
            msg = fail.get('message', '').split('\n')[-1] if fail.get('message') else fail.text.split('\n')[-2] if fail.text else ''
            f.write(f"CASE: {elem.get('classname')}.{elem.get('name')}\nMSG: {msg}\n---\n")
