#import "RCTNativeAqualinoWidget.h"
#import "Aqualino-Swift.h"
#import <UIKit/UIKit.h>

static NSString *const AqualinoAppGroup = @"group.br.com.aqualino.shared";
static NSString *const AqualinoSnapshotKey = @"snapshot_json";
static NSString *const AqualinoPendingActionKey = @"pending_action";

@interface RCTNativeAqualinoWidget ()
@property(strong, nonatomic) NSUserDefaults *sharedDefaults;
@end

@implementation RCTNativeAqualinoWidget

- (instancetype)init
{
  if (self = [super init]) {
    _sharedDefaults = [[NSUserDefaults alloc] initWithSuiteName:AqualinoAppGroup];
  }
  return self;
}

- (NSNumber *)writeSnapshot:(NSString *)snapshotJson
{
  [self.sharedDefaults setObject:snapshotJson forKey:AqualinoSnapshotKey];
  return @([self.sharedDefaults synchronize]);
}

- (void)requestReload
{
  [AqualinoWidgetReloader reload];
}

- (NSString *_Nullable)readPendingAction
{
  NSString *action = [self.sharedDefaults stringForKey:AqualinoPendingActionKey];
  [self.sharedDefaults removeObjectForKey:AqualinoPendingActionKey];
  return action;
}

- (NSNumber *)getSchemaVersion
{
  return @2;
}

- (NSNumber *)setAppIconMood:(NSString *)mood
{
  void (^updateIcon)(void) = ^{
    UIApplication *application = UIApplication.sharedApplication;
    if (!application.supportsAlternateIcons) {
      return;
    }

    NSString *desiredIcon = [mood isEqualToString:@"sad"] ? @"AppIconSad" : nil;
    NSString *currentIcon = application.alternateIconName;
    BOOL alreadySelected = (desiredIcon == nil && currentIcon == nil)
      || [desiredIcon isEqualToString:currentIcon];
    if (alreadySelected) {
      return;
    }

    [application setAlternateIconName:desiredIcon completionHandler:^(NSError *_Nullable error) {
      if (error != nil) {
        NSLog(@"[Aqualino] Não foi possível atualizar o ícone: %@", error.localizedDescription);
      }
    }];
  };

  if (NSThread.isMainThread) {
    updateIcon();
  } else {
    dispatch_async(dispatch_get_main_queue(), updateIcon);
  }
  return @YES;
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeAqualinoWidgetSpecJSI>(params);
}

+ (NSString *)moduleName
{
  return @"NativeAqualinoWidget";
}

@end
