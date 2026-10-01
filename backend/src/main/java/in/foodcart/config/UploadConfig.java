package in.foodcart.config;
import org.springframework.beans.factory.annotation.Value;import org.springframework.context.annotation.Configuration;import org.springframework.web.servlet.config.annotation.*;
@Configuration public class UploadConfig implements WebMvcConfigurer {@Value("${app.upload-dir:uploads}") String directory;@Override public void addResourceHandlers(ResourceHandlerRegistry r){r.addResourceHandler("/uploads/**").addResourceLocations("file:"+directory+"/");}}
