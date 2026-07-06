import 'package:flutter_test/flutter_test.dart';
import 'package:egs_ai/main.dart';

void main() {
  testWidgets('App loads successfully smoke test', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const EgsApp());

    // Verify that our Chat screen displays
    expect(find.byType(ChatHomeScreen), findsOneWidget);
  });
}
