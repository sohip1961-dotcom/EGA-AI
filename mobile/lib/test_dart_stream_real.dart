import 'dart:convert';

void testRenderSpanText(String lineText) {
  print("Testing: '$lineText'");
  final regex = RegExp(r'(\\\([\s\S]*?\\\))|(\$[^\$\n]+\$)|(\*\*[^*]+\*\*)|(\`[^\`]+\`)');
  
  int start = 0;
  for (var match in regex.allMatches(lineText)) {
    if (match.start > start) {
      print("Plain text span: '${lineText.substring(start, match.start)}'");
    }
    
    final value = match.group(0)!;
    print("Matched token: '$value'");
    
    if ((value.startsWith(r'\(') && value.endsWith(r'\)')) || 
        (value.startsWith(r'$') && value.endsWith(r'$'))) {
      final formula = value.startsWith(r'\(') 
          ? value.substring(2, value.length - 2) 
          : value.substring(1, value.length - 1);
      print("Math formula: '$formula'");
    } else if (value.startsWith('**') && value.endsWith('**')) {
      print("Bold text: '${value.substring(2, value.length - 2)}'");
    } else if (value.startsWith('`') && value.endsWith('`')) {
      print("Inline code: '${value.substring(1, value.length - 1)}'");
    }
    
    start = match.end;
  }
  
  if (start < lineText.length) {
    print("Trailing plain text span: '${lineText.substring(start)}'");
  }
  print("--- End of test ---\n");
}

void main() {
  testRenderSpanText("العلم نور");
  testRenderSpanText("العلم **مهم** جداً");
  testRenderSpanText(r"معادلة الطاقة هي $E = mc^2$ يا بطل");
  testRenderSpanText("كود البرمجة هو `print('hello')` في بايثون");
}
